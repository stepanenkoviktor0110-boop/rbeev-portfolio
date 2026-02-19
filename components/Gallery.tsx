'use client';

import type { Category, Photo } from '@prisma/client';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import Lightbox from './Lightbox';

type P = Photo & { category: Category };

export default function Gallery({ photos, categories }: { photos: P[]; categories: Category[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [openedIndex, setOpenedIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!active) return photos;
    return photos.filter((p) => p.categoryId === active);
  }, [active, photos]);

  return (
    <section id="gallery" className="fade-edges mx-auto max-w-6xl px-4 py-16">
      <h2 className="section-title mb-6">Галерея</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setActive(null)} className={`rounded-full border px-4 py-2 text-sm ${active === null ? 'border-accent text-accent' : 'border-white/20'}`}>Все</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)} className={`rounded-full border px-4 py-2 text-sm ${active === c.id ? 'border-accent text-accent' : 'border-white/20'}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((photo, i) => (
          <button key={photo.id} onClick={() => setOpenedIndex(i)} className="group relative overflow-hidden rounded-xl text-left">
            <Image
              src={`https://res.cloudinary.com/dt70epmum/image/upload/w_600,c_limit,f_auto,q_auto/${photo.filename}`}
              alt={photo.title}
              width={300}
              height={200}
              className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
              style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-black/50 p-3">
              <p className="font-medium">{photo.title}</p>
              <p className="text-xs text-white/70">{photo.category.name}</p>
            </div>
          </button>
        ))}
      </div>
      <Lightbox
        items={filtered}
        index={openedIndex}
        onClose={() => setOpenedIndex(null)}
        onNavigate={setOpenedIndex}
      />
    </section>
  );
}
