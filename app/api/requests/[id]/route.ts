import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const { id: rawId } = await params;
  const id = Number(rawId);
  const req = await prisma.contactRequest.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json(req);
}
