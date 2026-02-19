import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const body = await request.json();
  const settings = await prisma.settings.update({ where: { id: 1 }, data: body });
  return NextResponse.json(settings);
}
