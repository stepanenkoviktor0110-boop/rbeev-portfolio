import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { parseJsonSafe } from '@/lib/apiUtils';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { buildPublicFileKey, readPublicFolder } from '@/lib/storage/yandexDisk';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

function isValidYandexFolderUrl(value: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return /(?:^|\.)yandex\./i.test(url.hostname) || /(?:^|\.)ya\.ru$/i.test(url.hostname) || /(?:^|\.)yadi\.sk$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isYandexClientDiskUrl(value: string) {
  try {
    const url = new URL(value);
    return /\/client\/disk\//i.test(url.pathname);
  } catch {
    return false;
  }
}

async function getOrCreateCategoryByName(name: string) {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Некорректное имя категории');

  const existing = await prisma.category.findUnique({ where: { name: trimmed } });
  if (existing) return { category: existing, created: false };

  const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
  try {
    const category = await prisma.category.create({
      data: {
        name: trimmed,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
    return { category, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const category = await prisma.category.findUnique({ where: { name: trimmed } });
      if (category) return { category, created: false };
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `photo:import-folder:${ip}`, limit: 8, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много импортов папок. Попробуйте позже', rate.retryAfterSec);

  const body = (await parseJsonSafe(request)) as { publicUrl?: string } | null;
  const publicUrl = String(body?.publicUrl || '').trim();
  if (isYandexClientDiskUrl(publicUrl)) {
    return NextResponse.json(
      { error: 'Нужна публичная ссылка на папку (Поделиться -> Скопировать ссылку), а не внутренняя ссылка /client/disk/...' },
      { status: 400 }
    );
  }
  if (!isValidYandexFolderUrl(publicUrl)) {
    return NextResponse.json({ error: 'Нужна корректная HTTPS-ссылка на публичную папку Яндекс.Диска' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      (async () => {
        try {
          send({ type: 'progress', phase: 'start', completed: 0, total: 0, message: 'Читаем папку...' });

          // Read folder contents without downloading anything
          const folder = await readPublicFolder(publicUrl);

          if (folder.files.length === 0) {
            send({ type: 'error', error: 'В папке не найдено изображений (поддерживаются JPEG, PNG, WebP)' });
            return;
          }

          const { category, created } = await getOrCreateCategoryByName(folder.folderName);
          const maxOrder = await prisma.photo.aggregate({ _max: { sortOrder: true } });
          let currentOrder = maxOrder._max.sortOrder ?? 0;
          const total = folder.files.length;

          send({ type: 'progress', phase: 'db', completed: 0, total, message: `Найдено ${total} фото, создаём записи...` });

          for (let i = 0; i < folder.files.length; i += 1) {
            const file = folder.files[i];
            const storageKey = buildPublicFileKey(folder.publicKey, file.path);
            const imageUrl = `/api/photos/image?key=${encodeURIComponent(storageKey)}`;
            currentOrder += 1;

            await prisma.photo.create({
              data: {
                title: file.title,
                imageUrl,
                storageKey,
                categoryId: category.id,
                description: null,
                sortOrder: currentOrder,
                showInGallery: true,
              },
            });

            send({ type: 'progress', phase: 'db', completed: i + 1, total });
          }

          send({
            type: 'done',
            importedCount: folder.files.length,
            skippedCount: 0,
            category,
            categoryCreated: created,
          });
        } catch (error) {
          send({ type: 'error', error: (error as Error).message || 'Ошибка импорта папки' });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
