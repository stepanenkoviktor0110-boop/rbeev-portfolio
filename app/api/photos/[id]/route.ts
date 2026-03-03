import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { deleteYandexDiskResource } from '@/lib/storage/yandexDisk';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const photoUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    imageUrl: z.string().url().max(2000).refine((value) => value.startsWith('https://')).optional(),
    description: z.string().max(5000).nullable().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
    focalX: z.coerce.number().min(0).max(100).optional(),
    focalY: z.coerce.number().min(0).max(100).optional(),
    showInGallery: z.boolean().optional(),
    showInSlideshow: z.boolean().optional(),
    showInAbout: z.boolean().optional(),
  })
  .strict();

async function parseJsonSafe(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth) return auth;

    const csrf = requireSameOrigin(request);
    if (csrf) return csrf;
    const ip = getClientIp(request);
    const rate = checkRateLimit({ key: `admin:photos:update:${ip}`, limit: 240, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return rateLimitJsonResponse('Слишком много изменений. Попробуйте позже', rate.retryAfterSec);

    const p = await context.params;
    const id = parseId(p.id);
    if (!id) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });

    const parsed = photoUpdateSchema.safeParse(await parseJsonSafe(request));
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const photo = await prisma.photo.update({ where: { id }, data: parsed.data });
    return NextResponse.json(photo);
  } catch (error) {
    console.error('PUT /api/photos/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth) return auth;

    const csrf = requireSameOrigin(request);
    if (csrf) return csrf;
    const ip = getClientIp(request);
    const rate = checkRateLimit({ key: `admin:photos:delete:${ip}`, limit: 60, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return rateLimitJsonResponse('Слишком много удалений. Попробуйте позже', rate.retryAfterSec);

    const p = await context.params;
    const id = parseId(p.id);
    if (!id) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });

    const photo = await prisma.photo.delete({ where: { id }, select: { storageKey: true } });
    if (photo.storageKey) {
      try {
        await deleteYandexDiskResource(photo.storageKey);
      } catch (error) {
        console.error('Failed to delete Yandex Disk resource:', error);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    }
    console.error('DELETE /api/photos/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
