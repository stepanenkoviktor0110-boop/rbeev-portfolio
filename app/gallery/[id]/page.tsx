import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const photo = await prisma.photo.findUnique({ where: { id }, include: { category: true } });
  if (!photo) return notFound();

  const [prev, next] = await Promise.all([
    prisma.photo.findFirst({ where: { id: { lt: id } }, orderBy: { id: 'desc' } }),
    prisma.photo.findFirst({ where: { id: { gt: id } }, orderBy: { id: 'asc' } }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Image src={`https://res.cloudinary.com/dt70epmum/image/upload/w_1400,q_auto,f_auto/${photo.filename}`} alt={photo.title} width={1400} height={1000} className="h-auto w-full rounded-xl object-contain" />
      <h1 className="mt-6 font-serif text-4xl text-accent">{photo.title}</h1>
      <p className="text-white/70">{photo.category.name}</p>
      <p className="text-white/70">{new Date(photo.createdAt).toLocaleDateString('ru-RU')}</p>
      <div className="mt-6 flex gap-4">
        {prev && <a href={`/gallery/${prev.id}`}>← Предыдущее</a>}
        {next && <a href={`/gallery/${next.id}`}>Следующее →</a>}
      </div>
    </main>
  );
}
