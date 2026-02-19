import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const { name } = await request.json();
  const category = await prisma.category.create({ data: { name } });
  return NextResponse.json(category);
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const { id, name } = await request.json();
  const category = await prisma.category.update({ where: { id }, data: { name } });
  return NextResponse.json(category);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const { id } = await request.json();
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
