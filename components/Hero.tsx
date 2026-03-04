'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { HeroPhoto } from '@/lib/types';

interface HeroProps {
  settings: {
    heroTitle: string;
    heroSubtitle: string;
  };
  heroPhotos: HeroPhoto[];
}

export default function Hero({ settings, heroPhotos }: HeroProps) {
  const [slides, setSlides] = useState<HeroPhoto[]>(heroPhotos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);

  const currentPhoto = slides[currentIndex] ?? null;
  const subtitleRaw = settings.heroSubtitle?.trim() || '';
  const safeSubtitle = subtitleRaw || 'Моменты, где вы в центре и в своем ритме.';

  useEffect(() => {
    setSlides(heroPhotos);
  }, [heroPhotos]);

  useEffect(() => {
    let cancelled = false;

    const loadRandomSlides = async () => {
      try {
        const response = await fetch('/api/hero-photos', { cache: 'no-store' });
        if (!response.ok) return;
        const randomSlides = (await response.json()) as HeroPhoto[];
        if (!Array.isArray(randomSlides) || randomSlides.length === 0 || cancelled) return;

        setSlides((prev) => {
          const prevIds = prev.map((item) => item.id).join(',');
          const nextIds = randomSlides.map((item) => item.id).join(',');
          return prevIds === nextIds ? prev : randomSlides;
        });
        setCurrentIndex(0);
      } catch {
        // Keep SSR fallback slides when random fetch fails.
      }
    };

    loadRandomSlides();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    setCurrentIndex((prev) => (slides.length === 0 ? 0 : Math.min(prev, slides.length - 1)));
  }, [slides.length]);

  useEffect(() => {
    setImageReady(false);
  }, [currentPhoto?.id]);

  const title = useMemo(() => settings.heroTitle || 'Фотография вашей истории', [settings.heroTitle]);

  return (
    <section className="relative flex h-screen w-full items-center justify-center overflow-hidden text-center">
      <div className="absolute inset-0 bg-[#111]" />
      {currentPhoto && (
        <div
          key={currentPhoto.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: 1 }}
        >
          <Image
            src={currentPhoto.imageUrl}
            alt=""
            fill
            priority={currentIndex === 0}
            sizes="100vw"
            quality={70}
            className="object-cover transition-opacity duration-500"
            style={{
              transform: 'scale(1.04)',
              objectPosition: `${currentPhoto.focalX}% ${currentPhoto.focalY}%`,
              opacity: imageReady ? 1 : 0,
            }}
            onLoadingComplete={() => setImageReady(true)}
          />
          <div className="absolute inset-0 bg-black/55" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(6,6,6,0.3) 0%, rgba(6,6,6,0.16) 35%, rgba(6,6,6,0.58) 100%), radial-gradient(ellipse 85% 85% at 50% 50%, transparent 52%, rgba(0,0,0,0.62) 80%, rgba(0,0,0,0.94) 100%)',
            }}
          />
        </div>
      )}

      <div className="z-10 px-4">
        <h1
          className="mx-auto mb-4 max-w-4xl font-serif text-4xl leading-tight text-[#fff4d6] md:text-7xl"
          style={{ textShadow: '0 4px 18px rgba(0,0,0,0.96), 0 0 28px rgba(0,0,0,0.55)' }}
        >
          {title}
        </h1>
        <p
          className="mx-auto max-w-2xl text-[18px] text-white md:text-[20px]"
          style={{ textShadow: '0 3px 12px rgba(0,0,0,0.9)' }}
        >
          {safeSubtitle}
        </p>
        <a
          href="#gallery"
          className="mt-8 inline-flex items-center justify-center rounded-none border-[1.5px] border-accent/80 bg-black/35 px-12 py-4 font-medium text-white transition hover:border-accent hover:bg-accent/12"
        >
          Смотреть работы
        </a>
      </div>
    </section>
  );
}
