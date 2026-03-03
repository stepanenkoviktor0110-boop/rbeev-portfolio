'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { resolvePhotoUrl } from '@/lib/photoUrl';

type AboutPhoto = {
  id: number;
  imageUrl: string;
  title: string;
  focalX: number;
  focalY: number;
};

export default function About({ text, photos = [] }: { text: string; photos?: AboutPhoto[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fallbackText = 'Работаю с естественным светом и настроением, вниманием к эмоциям и настоящему моменту.';
  const sourceText = (text || fallbackText).trim();
  const paragraphs = sourceText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const firstParagraph = (paragraphs[0] || fallbackText).replace(/\s*\n+\s*/g, ' ').trim();
  const otherParagraphs = paragraphs.slice(1);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [photos.length]);

  const currentPhoto = photos[currentIndex] ?? null;

  return (
    <section id="about" className="fade-edges mx-auto max-w-6xl px-4 py-16">
      <div className={`card grid gap-6 p-8 ${photos.length > 0 ? 'md:grid-cols-[1.1fr_0.9fr] md:items-start' : ''}`}>
        <div>
          <h2 className="section-title mb-4">Обо мне</h2>
          <p className="overflow-hidden text-white/80 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:7]">
            {firstParagraph}
          </p>
          {otherParagraphs.length > 0 && (
            <div className="mt-4 space-y-3 text-white/80">
              {otherParagraphs.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-wrap">{paragraph}</p>
              ))}
            </div>
          )}
          <div className="mt-6 space-y-2 text-white/75">
            <p>Мне не интересно, как надо и правильно. Я про живое.</p>
            <a
              href="#contacts"
              className="inline-block text-accent/90 transition hover:text-accent"
            >
              Перейти к форме
            </a>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="relative h-64 overflow-hidden rounded-none border border-white/10 md:h-80">
            {currentPhoto && (
              <Image
                key={currentPhoto.id}
                src={resolvePhotoUrl(currentPhoto.imageUrl)}
                alt={currentPhoto.title}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
                style={{ objectPosition: `${currentPhoto.focalX}% ${currentPhoto.focalY}%` }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>
        )}
      </div>
    </section>
  );
}
