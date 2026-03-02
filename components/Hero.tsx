'use client';

import { useEffect, useState } from 'react';

interface HeroPhoto {
  id: number;
  filename: string;
  focalX: number;
  focalY: number;
}

interface HeroProps {
  settings: {
    heroTitle: string;
    heroSubtitle: string;
  };
  heroPhotos: HeroPhoto[];
}

export default function Hero({ settings, heroPhotos }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPhoto = heroPhotos[currentIndex] ?? null;
  const subtitleRaw = settings.heroSubtitle?.trim() || '';
  const bannedSubtitle = 'здесь живут моменты, которые почти не заметили себя';
  const normalizedSubtitle = subtitleRaw.toLowerCase().replace(/[.!?]+$/g, '').trim();
  const safeSubtitle =
    normalizedSubtitle === bannedSubtitle ? 'Эмоции, свет и история в каждом кадре.' : subtitleRaw || 'Эмоции, свет и история в каждом кадре.';

  useEffect(() => {
    if (heroPhotos.length < 2) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroPhotos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroPhotos.length]);

  useEffect(() => {
    setCurrentIndex((prev) => (heroPhotos.length === 0 ? 0 : Math.min(prev, heroPhotos.length - 1)));
  }, [heroPhotos.length]);

  return (
    <section className="relative flex h-screen w-full items-center justify-center overflow-hidden text-center">
      {/* Blurred background slideshow */}
      {currentPhoto && (
        <div
          key={currentPhoto.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: 1 }}
        >
          <img
            src={`https://res.cloudinary.com/dt70epmum/image/upload/w_2560,c_limit,f_auto,q_auto:best,dpr_auto/${currentPhoto.filename}`}
            alt=""
            className="h-full w-full object-cover"
            style={{
              filter: 'blur(10px)',
              transform: 'scale(1.08)',
              objectPosition: `${currentPhoto.focalX}% ${currentPhoto.focalY}%`,
            }}
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
      )}

      {/* Content */}
      <div className="z-10 px-4">
        <h1 className="mb-4 font-serif text-4xl text-accent md:text-7xl">
          {settings.heroTitle || 'Профессиональный фотограф'}
        </h1>
        <p className="mx-auto max-w-2xl text-[18px] text-white/85 md:text-[20px]">
          {safeSubtitle}
        </p>
        <a
          href="#gallery"
          className="mt-8 inline-flex items-center justify-center rounded-none border-[1.5px] border-accent/70 bg-black/20 px-12 py-4 font-medium text-white/95 transition hover:border-accent hover:bg-accent/10"
        >
          Смотреть работы
        </a>
      </div>
    </section>
  );
}
