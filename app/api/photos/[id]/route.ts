import { removeImage } from '@/lib/files';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, context: any) {
  try {
    const auth = await requireAdmin();
    if (auth) return auth;
    const p = await context.params;
    const id = Number(p.id);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.categoryId !== undefined) data.categoryId = Number(body.categoryId);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    if (body.focalX !== undefined) data.focalX = Number(body.focalX);
    if (body.focalY !== undefined) data.focalY = Number(body.focalY);
    const photo = await prisma.photo.update({ where: { id }, data });
    return NextResponse.json(photo);
  } catch (error) {
    console.error('PUT /api/photos/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: any) {
  try {
    const auth = await requireAdmin();
    if (auth) return auth;
    const p = await context.params;
    const id = Number(p.id);
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    await prisma.photo.delete({ where: { id } });
    await removeImage(photo.filename);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/photos/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
