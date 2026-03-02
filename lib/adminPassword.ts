import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from './prisma';

const legacyFilePath = path.join(process.cwd(), '.admin-password');

function getInitialAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD is required and must be at least 8 characters');
  }
  return password;
}

async function readLegacyHash(): Promise<string | null> {
  try {
    const value = (await fs.readFile(legacyFilePath, 'utf-8')).trim();
    return value || null;
  } catch {
    return null;
  }
}

async function getOrCreateSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
    select: { id: true, adminPasswordHash: true },
  });
}

async function persistPasswordHash(hash: string) {
  await prisma.settings.update({
    where: { id: 1 },
    data: { adminPasswordHash: hash },
  });
}

async function getPasswordHash() {
  const settings = await getOrCreateSettings();
  if (settings.adminPasswordHash) return settings.adminPasswordHash;

  const legacyHash = await readLegacyHash();
  if (legacyHash) {
    await persistPasswordHash(legacyHash);
    return legacyHash;
  }

  const generated = await bcrypt.hash(getInitialAdminPassword(), 10);
  await persistPasswordHash(generated);
  return generated;
}

export async function verifyAdminPassword(password: string) {
  const hash = await getPasswordHash();
  return bcrypt.compare(password, hash);
}

export async function setAdminPassword(password: string) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const hash = await bcrypt.hash(password, 10);
  await getOrCreateSettings();
  await persistPasswordHash(hash);
}
