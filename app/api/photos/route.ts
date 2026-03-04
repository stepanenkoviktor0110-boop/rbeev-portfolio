import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { parseIntParam } from '@/lib/apiUtils';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { uploadImageToYandexDisk } from '@/lib/storage/yandexDisk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has('page') || searchParams.has('pageSize');

  if (!hasPagination) {
    const photos = await prisma.photo.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(photos);
  }

  const page = parseIntParam(searchParams.get('page'), 1, 1, 100000);
  const pageSize = parseIntParam(searchParams.get('pageSize'), 24, 1, 100);
  const skip = (page - 1) * pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.photo.findMany({
      orderBy: { sortOrder: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.photo.count(),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `photo:upload:${ip}`, limit: 30, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много загрузок. Попробуйте позже', rate.retryAfterSec);

  const formData = await request.formData();
  const file = formData.get('file');
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const categoryId = Number(formData.get('categoryId'));

  // Use Blob instead of File — File global is not available in Node.js 18 runtime
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Файл обязателен' }, { status: 400 });
  if (!title || title.length > 200) {
    return NextResponse.json({ error: 'Некорректное название' }, { status: 400 });
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: 'Некорректная категория' }, { status: 400 });
  }
  if (description && description.length > 5000) {
    return NextResponse.json({ error: 'Описание слишком длинное' }, { status: 400 });
  }

  try {
    const uploaded = await uploadImageToYandexDisk(file as File);
    const maxOrder = await prisma.photo.aggregate({ _max: { sortOrder: true } });
    const photo = await prisma.photo.create({
      data: {
        title,
        imageUrl: uploaded.imageUrl,
        storageKey: uploaded.storageKey,
        categoryId,
        description,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json(photo);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
