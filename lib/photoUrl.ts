export function resolvePhotoUrl(imageUrl: string): string {
  const value = (imageUrl || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return value;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dt70epmum';
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${value}`;
}
