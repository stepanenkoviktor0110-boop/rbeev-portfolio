import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { HeroPhoto } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<HeroPhoto[]>(Prisma.sql`
      SELECT id, "imageUrl", "focalX", "focalY"
      FROM "Photo"
      WHERE "showInSlideshow" = true
      ORDER BY RANDOM()
      LIMIT 5
    `);

    return NextResponse.json(rows, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/hero-photos error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки фото слайдера' }, { status: 500 });
  }
}
