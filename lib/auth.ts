import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  role: 'admin';
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is required and must be at least 16 characters');
  }
  return secret;
}

function sign(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(body);
  return `v1.${body}.${signature}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const [, body, signature] = parts;

  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  if (!timingSafeEqual(left, right)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    return payload.role === 'admin' && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export const setSession = async () => {
  const store = await cookies();
  const token = encodeSession({
    role: 'admin',
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
};

export const clearSession = async () => {
  const store = await cookies();
  store.delete(COOKIE_NAME);
};

export const isAuthorized = async () => {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
};
