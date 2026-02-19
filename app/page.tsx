import About from '@/components/About';
import ContactForm from '@/components/ContactForm';
import Gallery from '@/components/Gallery';
import Hero from '@/components/Hero';
import Navigation from '@/components/Navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [settings, photos, categories] = await Promise.all([
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.photo.findMany({ include: { category: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  // Parse hero photo IDs from settings and find matching photos
  let heroPhotoIds: number[] = [];
  try {
    heroPhotoIds = JSON.parse(settings.heroPhotoIds || '[]');
  } catch {
    heroPhotoIds = [];
  }
  const heroPhotos = heroPhotoIds.length > 0
    ? heroPhotoIds
        .map((id) => photos.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({ id: p!.id, filename: p!.filename }))
    : [];

  return (
    <main>
      <Navigation />
      <Hero settings={settings} heroPhotos={heroPhotos} />
      <Gallery photos={photos} categories={categories} />
      <About text={settings.aboutText} />
      <section id="contacts" className="fade-edges mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 className="section-title mb-4">Контакты</h2>
          {settings.email && <p>Email: {settings.email}</p>}
          {settings.phone && <p>Телефон: {settings.phone}</p>}
          {settings.telegram && <p>Telegram: {settings.telegram}</p>}
          {settings.whatsapp && <p>WhatsApp: {settings.whatsapp}</p>}
          {settings.instagram && <p>Instagram: {settings.instagram}</p>}
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
