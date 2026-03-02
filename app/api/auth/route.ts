import { clearSession, isAuthorized, setSession } from '@/lib/auth';
import { setAdminPassword, verifyAdminPassword } from '@/lib/adminPassword';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const loginSchema = z.object({
  password: z.string().min(4).max(128),
});

const changePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

async function parseJsonSafe(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ ok: await isAuthorized() });
}

export async function POST(request: Request) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `auth:login:${ip}`, limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много попыток входа', rate.retryAfterSec);

  const parsed = loginSchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  const valid = await verifyAdminPassword(parsed.data.password);
  if (!valid) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });

  await setSession();
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!(await isAuthorized())) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `auth:password-change:${ip}`, limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много попыток смены пароля', rate.retryAfterSec);

  const parsed = changePasswordSchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  await setAdminPassword(parsed.data.password);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  await clearSession();
  return NextResponse.json({ ok: true });
}
