import { NextResponse } from 'next/server';
import { isAuthorized } from './auth';

export async function requireAdmin() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }
  return null;
}
