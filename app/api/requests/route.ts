import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5).max(5000),
  shootingDate: z.string().max(40).optional(),
  personalDataConsent: z.literal(true),
  personalDataConsentCheckedAt: z.string().datetime().optional(),
  website: z.string().max(0).optional(),
});

function getValidationErrorMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return 'Проверьте поля формы';

  switch (issue.path[0]) {
    case 'name':
      return 'Имя должно содержать минимум 2 символа';
    case 'contact':
      return 'Контакт должен содержать минимум 3 символа';
    case 'message':
      return 'Сообщение должно содержать минимум 5 символов';
    case 'shootingDate':
      return 'Некорректная дата фотосессии';
    case 'personalDataConsent':
      return 'Необходимо согласие на обработку персональных данных';
    case 'personalDataConsentCheckedAt':
      return 'Некорректная дата согласия';
    default:
      return 'Проверьте поля формы';
  }
}

function parseIntParam(value: string | null, fallback: number, min = 1, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

async function parseJsonSafe(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const hasPagination =
    searchParams.has('page') ||
    searchParams.has('pageSize') ||
    searchParams.has('q') ||
    searchParams.has('unread');

  if (!hasPagination) {
    const requests = await prisma.contactRequest.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(requests);
  }

  const page = parseIntParam(searchParams.get('page'), 1, 1, 100000);
  const pageSize = parseIntParam(searchParams.get('pageSize'), 20, 1, 100);
  const q = (searchParams.get('q') || '').trim();
  const unreadOnly = searchParams.get('unread') === '1';

  const where: Prisma.ContactRequestWhereInput = {};
  if (unreadOnly) where.isRead = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { contact: { contains: q, mode: 'insensitive' } },
      { message: { contains: q, mode: 'insensitive' } },
      { shootingDate: { contains: q, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.contactRequest.count({ where }),
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
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `contact:create:${ip}`, limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много заявок. Попробуйте позже', rate.retryAfterSec);

  try {
    const parsed = createRequestSchema.safeParse(await parseJsonSafe(request));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: getValidationErrorMessage(parsed.error),
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, contact, message, shootingDate, personalDataConsentCheckedAt } = parsed.data;
    const consentAt = personalDataConsentCheckedAt ? new Date(personalDataConsentCheckedAt) : new Date();
    const safeConsentAt = Number.isNaN(consentAt.getTime()) ? new Date() : consentAt;
    const created = await prisma.contactRequest.create({
      data: {
        name,
        contact,
        message,
        shootingDate: shootingDate || '',
        personalDataConsentAt: safeConsentAt,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error('POST /api/requests error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
