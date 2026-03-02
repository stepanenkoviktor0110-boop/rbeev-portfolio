import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const publicSettingsSelect = {
  id: true,
  aboutText: true,
  personalDataConsentText: true,
  personalDataPolicyText: true,
  email: true,
  phone: true,
  telegram: true,
  whatsapp: true,
  instagram: true,
  heroTitle: true,
  heroSubtitle: true,
  workflowTitle: true,
  workflowItems: true,
  heroPhotoIds: true,
  aboutPhotoIds: true,
} as const;

const settingsUpdateSchema = z
  .object({
    id: z.number().int().optional(),
    aboutText: z.string().max(10000).optional(),
    personalDataConsentText: z.string().max(30000).optional(),
    personalDataPolicyText: z.string().max(30000).optional(),
    email: z.string().max(320).optional(),
    phone: z.string().max(100).optional(),
    telegram: z.string().max(200).optional(),
    whatsapp: z.string().max(100).optional(),
    instagram: z.string().max(200).optional(),
    heroTitle: z.string().max(200).optional(),
    heroSubtitle: z.string().max(500).optional(),
    workflowTitle: z.string().max(200).optional(),
    workflowItems: z.string().max(30000).optional(),
    heroPhotoIds: z.string().max(5000).optional(),
    aboutPhotoIds: z.string().max(5000).optional(),
  })
  .strict();

function parseJsonIds(value: unknown): number[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter(Number.isFinite);
  } catch {
    return [];
  }
}

async function parseJsonSafe(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
    select: publicSettingsSelect,
  });
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:settings:${ip}`, limit: 30, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много сохранений. Попробуйте позже', rate.retryAfterSec);

  const parsed = settingsUpdateSchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  const body: Record<string, unknown> = { ...parsed.data };
  delete body.id;

  const hasHeroPhotoIds = body.heroPhotoIds !== undefined;
  const hasAboutPhotoIds = body.aboutPhotoIds !== undefined;
  const heroPhotoIds = hasHeroPhotoIds ? parseJsonIds(body.heroPhotoIds) : [];
  const aboutPhotoIds = hasAboutPhotoIds ? parseJsonIds(body.aboutPhotoIds) : [];
  const requestedIds = [...new Set([...heroPhotoIds, ...aboutPhotoIds])];

  const allowedPhotos = requestedIds.length
    ? await prisma.photo.findMany({
        where: { id: { in: requestedIds } },
        select: { id: true, showInSlideshow: true, showInAbout: true },
      })
    : [];

  const slideshowAllowedIds = new Set(allowedPhotos.filter((p) => p.showInSlideshow).map((p) => p.id));
  const aboutAllowedIds = new Set(allowedPhotos.filter((p) => p.showInAbout).map((p) => p.id));

  if (hasHeroPhotoIds) {
    body.heroPhotoIds = JSON.stringify(heroPhotoIds.filter((id) => slideshowAllowedIds.has(id)));
  }
  if (hasAboutPhotoIds) {
    body.aboutPhotoIds = JSON.stringify(aboutPhotoIds.filter((id) => aboutAllowedIds.has(id)).slice(0, 3));
  }

  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: body,
    select: publicSettingsSelect,
  });
  return NextResponse.json(settings);
}
