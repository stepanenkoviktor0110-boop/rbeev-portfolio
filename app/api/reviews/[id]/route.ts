import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const reviewUpdateSchema = z
  .object({
    authorName: z.string().trim().min(1).max(120).optional(),
    text: z.string().trim().min(3).max(3000).optional(),
    isPublished: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
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

function checkReviewsRateLimit(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:reviews:${ip}`, limit: 90, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много действий. Попробуйте позже', rate.retryAfterSec);
  return null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkReviewsRateLimit(request);
  if (rl) return rl;

  const p = await params;
  const id = parseId(p.id);
  if (!id) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });

  const parsed = reviewUpdateSchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  }

  try {
    const review = await prisma.review.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkReviewsRateLimit(request);
  if (rl) return rl;

  const p = await params;
  const id = parseId(p.id);
  if (!id) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });

  try {
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
