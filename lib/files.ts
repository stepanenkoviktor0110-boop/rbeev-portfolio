import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function saveImage(file: File): Promise<string> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) throw new Error('Неверный формат файла');
  if (file.size > 10 * 1024 * 1024) throw new Error('Файл больше 10MB');

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'rbeev-portfolio', resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Ошибка загрузки'));
        resolve(result.public_id);
      }
    ).end(buffer);
  });
}

export async function removeImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function getImageUrl(publicId: string): string {
  return cloudinary.url(publicId, { secure: true });
}

export function getThumbUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    width: 600,
    crop: 'limit',
    fetch_format: 'auto',
    quality: 'auto',
  });
}
