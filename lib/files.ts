import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isAllowedImageBuffer(buffer: Buffer) {
  if (buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  return isJpeg || isPng || isWebp;
}

export async function saveImage(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Файл больше 10MB');

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isAllowedImageBuffer(buffer)) throw new Error('Неверный формат файла');

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'rbeev-portfolio', resource_type: 'image' }, (error, result) => {
        if (error || !result) return reject(error || new Error('Ошибка загрузки'));
        resolve(result.public_id);
      })
      .end(buffer);
  });
}

export async function removeImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
