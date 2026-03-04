import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { parseJsonSafe } from '@/lib/apiUtils';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createBusyDateSchema = z
  .object({
    isoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    requestId: z.number().int().positive(),
  })
  .strict();

function checkBusyDatesRateLimit(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:busy-dates:${ip}`, limit: 120, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много действий. Попробуйте позже', rate.retryAfterSec);
  return null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const busyDates = await prisma.busyDate.findMany({
    orderBy: [{ isoDate: 'asc' }],
    select: {
      isoDate: true,
      requestId: true,
      request: { select: { name: true, contact: true, shootingDate: true } },
    },
  });

  return NextResponse.json(busyDates);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkBusyDatesRateLimit(request);
  if (rl) return rl;

  const parsed = createBusyDateSchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  const requestExists = await prisma.contactRequest.findUnique({
    where: { id: parsed.data.requestId },
    select: { id: true },
  });
  if (!requestExists) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });

  try {
    const busyDate = await prisma.busyDate.create({
      data: {
        isoDate: parsed.data.isoDate,
        requestId: parsed.data.requestId,
      },
      select: {
        isoDate: true,
        requestId: true,
      },
    });
    return NextResponse.json(busyDate);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.busyDate.findUnique({
        where: { isoDate: parsed.data.isoDate },
        select: { requestId: true },
      });
      return NextResponse.json(
        {
          error: 'Дата уже занята',
          existingRequestId: existing?.requestId ?? null,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
