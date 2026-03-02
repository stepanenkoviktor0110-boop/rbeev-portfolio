import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    contact: z.string().trim().min(3).max(200).optional(),
    message: z.string().trim().min(1).max(5000).optional(),
    shootingDate: z.string().max(40).optional(),
    isRead: z.boolean().optional(),
  })
  .strict();

async function parseJsonSafe(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:requests:update:${ip}`, limit: 180, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много действий. Попробуйте позже', rate.retryAfterSec);

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });

  const rawBody = await parseJsonSafe(request);
  let data: Record<string, unknown>;

  if (!rawBody || (typeof rawBody === 'object' && Object.keys(rawBody as object).length === 0)) {
    data = { isRead: true };
  } else {
    const parsed = requestUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }
    data = parsed.data;
    if (Object.keys(data).length === 0) data = { isRead: true };
  }

  try {
    const req = await prisma.contactRequest.update({ where: { id }, data });
    return NextResponse.json(req);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:requests:delete:${ip}`, limit: 60, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много удалений. Попробуйте позже', rate.retryAfterSec);

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });

  try {
    await prisma.contactRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
