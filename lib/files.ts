import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export const uploadDir = path.join(process.cwd(), 'public/uploads');
export const thumbsDir = path.join(uploadDir, 'thumbs');

export async function ensureDirs() {
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(thumbsDir, { recursive: true });
}

export async function saveImage(file: File) {
  await ensureDirs();
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) throw new Error('Неверный формат файла');
  if (file.size > 10 * 1024 * 1024) throw new Error('Файл больше 10MB');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${Date.now()}-${safeName}`;
  const originalPath = path.join(uploadDir, filename);
  const thumbPath = path.join(thumbsDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(originalPath, buffer);
  await sharp(buffer).resize(600, undefined, { fit: 'inside', withoutEnlargement: true }).toFile(thumbPath);
  return filename;
}

export async function removeImage(filename: string) {
  await Promise.allSettled([
    fs.unlink(path.join(uploadDir, filename)),
    fs.unlink(path.join(thumbsDir, filename)),
  ]);
}
