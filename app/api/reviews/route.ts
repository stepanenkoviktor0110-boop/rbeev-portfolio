import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { parseJsonSafe } from '@/lib/apiUtils';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createReviewSchema = z
  .object({
    authorName: z.string().trim().min(1).max(120),
    text: z.string().trim().min(3).max(3000),
    isPublished: z.boolean().optional(),
  })
  .strict();

function checkReviewsRateLimit(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:reviews:${ip}`, limit: 90, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много действий. Попробуйте позже', rate.retryAfterSec);
  return null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const reviews = await prisma.review.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(reviews);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkReviewsRateLimit(request);
  if (rl) return rl;

  const parsed = createReviewSchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  const maxSort = await prisma.review.aggregate({ _max: { sortOrder: true } });
  const review = await prisma.review.create({
    data: {
      authorName: parsed.data.authorName,
      text: parsed.data.text,
      isPublished: parsed.data.isPublished ?? true,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json(review);
}
