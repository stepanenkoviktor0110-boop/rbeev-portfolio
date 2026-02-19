'use client';

import { Settings } from '@prisma/client';
import { useEffect, useState } from 'react';

interface HeroPhoto {
  id: number;
  filename: string;
}

interface HeroProps {
  settings: Settings;
  heroPhotos: HeroPhoto[];
}

export default function Hero({ settings, heroPhotos }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (heroPhotos.length < 2) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroPhotos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroPhotos.length]);

  return (
    <section className="relative flex h-screen w-full items-center justify-center overflow-hidden text-center">
      {/* Blurred background slideshow */}
      {heroPhotos.map((photo, i) => (
        <div
          key={photo.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === currentIndex ? 1 : 0 }}
        >
          <img
            src={`/uploads/${photo.filename}`}
            alt=""
            className="h-full w-full object-cover"
            style={{ filter: 'blur(10px)', transform: 'scale(1.08)' }}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/55" />
          {/* Edge blur vignette via mask */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.92) 100%)',
            }}
          />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 px-4">
        <h1 className="mb-4 font-serif text-5xl text-accent md:text-7xl">
          {settings.heroTitle || 'Профессиональный фотограф'}
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-white/80">
          {settings.heroSubtitle || 'Эмоции, свет и история в каждом кадре.'}
        </p>
        <a
          href="#gallery"
          className="rounded-full bg-accent px-6 py-3 font-medium text-black transition hover:opacity-90"
        >
          Смотреть работы
        </a>
      </div>
    </section>
  );
}
