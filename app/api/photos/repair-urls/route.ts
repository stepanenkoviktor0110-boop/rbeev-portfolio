import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { requireSameOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';

// POST /api/photos/repair-urls
// Rewrites imageUrl for all photos that have a storageKey but use a
// temporary Yandex Disk URL (not our proxy format).
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const photos = await prisma.photo.findMany({
    select: { id: true, imageUrl: true, storageKey: true },
  });

  const toFix = photos.filter(
    (p) => p.storageKey && !p.imageUrl.startsWith('/api/photos/image')
  );

  if (toFix.length === 0) {
    return NextResponse.json({ fixed: 0, message: 'Все фото уже используют корректный формат' });
  }

  await prisma.$transaction(
    toFix.map((p) =>
      prisma.photo.update({
        where: { id: p.id },
        data: { imageUrl: `/api/photos/image?key=${encodeURIComponent(p.storageKey!)}` },
      })
    )
  );

  return NextResponse.json({ fixed: toFix.length });
}
