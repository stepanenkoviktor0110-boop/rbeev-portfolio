import About from '@/components/About';
import AvailabilityRibbon from '@/components/AvailabilityRibbon';
import ContactForm from '@/components/ContactForm';
import Gallery from '@/components/Gallery';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import Navigation from '@/components/Navigation';
import Reviews from '@/components/Reviews';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const publicSettingsSelect = {
  id: true,
  aboutText: true,
  personalDataConsentText: true,
  personalDataPolicyText: true,
  email: true,
  phone: true,
  telegram: true,
  whatsapp: true,
  instagram: true,
  heroTitle: true,
  heroSubtitle: true,
  workflowTitle: true,
  workflowItems: true,
  heroPhotoIds: true,
  aboutPhotoIds: true,
} as const;

function toTelegramLink(value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://t.me/${v.replace(/^@/, '')}`;
}

function toInstagramLink(value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, '')}`;
}

export default async function HomePage() {
  const [settings, galleryPhotos, heroPhotos, aboutPhotos, categories, busyDates, reviews] = await Promise.all([
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 }, select: publicSettingsSelect }),
    prisma.photo.findMany({
      where: { showInGallery: true },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.photo.findMany({
      where: { showInSlideshow: true },
      select: { id: true, filename: true, focalX: true, focalY: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.photo.findMany({
      where: { showInAbout: true },
      select: { id: true, filename: true, title: true, focalX: true, focalY: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    prisma.busyDate.findMany({
      select: { isoDate: true },
      orderBy: [{ isoDate: 'asc' }],
    }),
    prisma.review.findMany({
      where: { isPublished: true },
      select: { id: true, authorName: true, text: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
  ]);
  const telegramLink = settings.telegram ? toTelegramLink(settings.telegram) : '';
  const instagramLink = settings.instagram ? toInstagramLink(settings.instagram) : '';

  return (
    <main>
      <Navigation />
      <Hero settings={settings} heroPhotos={heroPhotos} />
      <AvailabilityRibbon busyDates={busyDates.map((item) => item.isoDate)} />
      <Gallery photos={galleryPhotos} categories={categories} />
      <section className="mx-auto flex max-w-6xl items-center justify-center px-4 py-14">
        <p className="text-center text-lg text-white/60">Это лишь часть историй. Остальные ждут своего момента.</p>
      </section>
      <About text={settings.aboutText} photos={aboutPhotos} />
      <HowItWorks title={settings.workflowTitle} itemsJson={settings.workflowItems} />
      <section id="contacts" className="fade-edges mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
        <div className="card space-y-5 p-6">
          <h2 className="section-title text-4xl md:text-5xl">Напишите — и мы найдём ваш кадр</h2>

          <div className="space-y-2 text-white/80">
            {settings.email && <p>Email: {settings.email}</p>}
            {settings.phone && <p>Телефон: {settings.phone}</p>}
            {settings.whatsapp && <p>WhatsApp: {settings.whatsapp}</p>}
          </div>

          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noreferrer"
              className="ui-button inline-flex w-full items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d="M9.78 15.18 9.4 20.3c.54 0 .77-.23 1.05-.5l2.52-2.41 5.22 3.82c.96.53 1.64.25 1.9-.88l3.44-16.13h.01c.3-1.4-.5-1.95-1.44-1.6L1.87 10.36c-1.38.54-1.36 1.31-.24 1.65l5.74 1.79L20.7 5.46c.63-.42 1.2-.19.72.23" />
              </svg>
              <span>Написать в Telegram</span>
            </a>
          )}

          {(instagramLink || settings.instagram) && (
            <div className="flex items-center gap-3 text-sm text-white/55">
              <span>Соцсети:</span>
              {instagramLink && (
                <a
                  href={instagramLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="text-white/65 transition hover:text-accent"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.35 1.8h-8.2A4.1 4.1 0 0 0 3.8 7.9v8.2a4.1 4.1 0 0 0 4.1 4.1h8.2a4.1 4.1 0 0 0 4.1-4.1V7.9a4.1 4.1 0 0 0-4.1-4.1Zm-4.1 2.95A5.25 5.25 0 1 1 6.75 12 5.25 5.25 0 0 1 12 6.75Zm0 1.8A3.45 3.45 0 1 0 15.45 12 3.45 3.45 0 0 0 12 8.55Zm5.95-2.3a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2Z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
        <ContactForm
          personalDataConsentText={settings.personalDataConsentText}
          personalDataPolicyText={settings.personalDataPolicyText}
        />
      </section>
      <Reviews reviews={reviews} />
    </main>
  );
}

