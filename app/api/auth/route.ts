import { clearSession, isAuthorized, setSession } from '@/lib/auth';
import { setAdminPassword, verifyAdminPassword } from '@/lib/adminPassword';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const loginSchema = z.object({ password: z.string().min(4) });

export async function GET() {
  return NextResponse.json({ ok: await isAuthorized() });
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  const valid = await verifyAdminPassword(parsed.data.password);
  if (!valid) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  await setSession();
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!(await isAuthorized())) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  await setAdminPassword(parsed.data.password);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
