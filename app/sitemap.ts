import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const photos = await prisma.photo.findMany({ where: { showInGallery: true }, select: { id: true, createdAt: true } });
  return [
    { url: `${base}/`, lastModified: new Date() },
    ...photos.map((p) => ({ url: `${base}/gallery/${p.id}`, lastModified: p.createdAt })),
  ];
}
