import { saveImage } from '@/lib/files';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;
  const photos = await prisma.photo.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(photos);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const formData = await request.formData();
  const file = formData.get('file');
  const title = String(formData.get('title') || '');
  const description = String(formData.get('description') || '') || null;
  const categoryId = Number(formData.get('categoryId'));

  if (!(file instanceof File)) return NextResponse.json({ error: 'Файл обязателен' }, { status: 400 });
  if (!title || !categoryId) return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });

  try {
    const filename = await saveImage(file);
    const maxOrder = await prisma.photo.aggregate({ _max: { sortOrder: true } });
    const photo = await prisma.photo.create({
      data: { title, filename, categoryId, description, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    });
    return NextResponse.json(photo);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
