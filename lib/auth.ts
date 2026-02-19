import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';

export const getAdminHash = async () => bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);

export const verifyPassword = async (password: string) => {
  const hash = await getAdminHash();
  return bcrypt.compare(password, hash);
};

export const setSession = async () => {
  const store = await cookies();
  store.set(COOKIE_NAME, 'ok', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
};

export const clearSession = async () => {
  const store = await cookies();
  store.delete(COOKIE_NAME);
};

export const isAuthorized = async () => {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === 'ok';
};