import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function checkBusyDatesRateLimit(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:busy-dates:${ip}`, limit: 120, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много действий. Попробуйте позже', rate.retryAfterSec);
  return null;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ isoDate: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkBusyDatesRateLimit(request);
  if (rl) return rl;

  const { isoDate } = await params;
  if (!isIsoDate(isoDate)) return NextResponse.json({ error: 'Некорректная дата' }, { status: 400 });

  try {
    await prisma.busyDate.delete({ where: { isoDate } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Дата не найдена' }, { status: 404 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
