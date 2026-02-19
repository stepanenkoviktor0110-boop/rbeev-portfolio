import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';

const filePath = path.join(process.cwd(), '.admin-password');

async function readHash(): Promise<string | null> {
  try {
    return (await fs.readFile(filePath, 'utf-8')).trim();
  } catch {
    return null;
  }
}

export async function getPasswordHash() {
  const stored = await readHash();
  if (stored) return stored;
  return bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
}

export async function verifyAdminPassword(password: string) {
  const hash = await getPasswordHash();
  return bcrypt.compare(password, hash);
}

export async function setAdminPassword(password: string) {
  const hash = await bcrypt.hash(password, 10);
  await fs.writeFile(filePath, hash, 'utf-8');
}