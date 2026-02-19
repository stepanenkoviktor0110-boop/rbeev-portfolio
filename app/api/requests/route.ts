import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(2), contact: z.string().min(3), message: z.string().min(5), shootingDate: z.string().optional() });

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;
  const requests = await prisma.contactRequest.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Проверьте поля формы' }, { status: 400 });
    const { name, contact, message } = parsed.data;
    const created = await prisma.contactRequest.create({
      data: { name, contact, message },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error('POST /api/requests error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
