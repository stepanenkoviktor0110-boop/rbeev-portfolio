'use client';

import type { Category, Photo } from '@prisma/client';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { displayCategoryName } from '@/lib/categoryLabel';
import { COOKIE_CONSENT_EVENT, loadSitePrefs, saveSitePrefs } from '@/lib/cookieConsent';
import Lightbox from './Lightbox';

type P = Photo & { category: Category };
const INITIAL_VISIBLE = 12;

export default function Gallery({ photos, categories }: { photos: P[]; categories: Category[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [openedIndex, setOpenedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  const categoryOrder = useMemo(() => {
    const map = new Map<number, number>();
    categories.forEach((category, index) => {
      map.set(category.id, index);
    });
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const base = !active ? photos : photos.filter((p) => p.categoryId === active);
    if (active) return base;
    return [...base].sort((a, b) => {
      const categoryScore = (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0);
      if (categoryScore !== 0) return categoryScore;
      return a.sortOrder - b.sortOrder;
    });
  }, [active, categoryOrder, photos]);

  useEffect(() => {
    const prefs = loadSitePrefs();
    if (prefs) {
      const nextActive =
        typeof prefs.galleryCategoryId === 'number' &&
        categories.some((c) => c.id === prefs.galleryCategoryId)
          ? prefs.galleryCategoryId
          : null;
      setActive(nextActive);
    }
    setPrefsReady(true);

    const onConsentUpdated = () => {
      saveSitePrefs({
        galleryCategoryId: active,
      });
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentUpdated);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  useEffect(() => {
    setShowAll(false);
    setOpenedIndex(null);
  }, [active]);

  useEffect(() => {
    if (!prefsReady) return;
    saveSitePrefs({
      galleryCategoryId: active,
    });
  }, [active, prefsReady]);

  const visibleItems = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hasMore = filtered.length > INITIAL_VISIBLE;
  const aspectPattern = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/3]'];

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="section-title mb-6">Галерея</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className={[
            'inline-flex h-10 items-center justify-center rounded-none border px-5 text-sm font-medium transition duration-200',
            active === null ? 'border-[#b8963e] bg-[#b8963e] text-black' : 'border-[#b8963e] text-[#b8963e] hover:bg-[#b8963e]/12',
          ].join(' ')}
        >
          Все
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={[
              'inline-flex h-10 items-center justify-center rounded-none border px-5 text-sm font-medium transition duration-200',
              active === c.id ? 'border-[#b8963e] bg-[#b8963e] text-black' : 'border-[#b8963e] text-[#b8963e] hover:bg-[#b8963e]/12',
            ].join(' ')}
          >
            {displayCategoryName(c.name)}
          </button>
        ))}
      </div>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {visibleItems.map((photo) => {
          const indexInFiltered = filtered.findIndex((item) => item.id === photo.id);
          const aspectClass = aspectPattern[indexInFiltered % aspectPattern.length];
          return (
            <button
              key={photo.id}
              onClick={() => setOpenedIndex(indexInFiltered >= 0 ? indexInFiltered : null)}
              className="group relative mb-4 block w-full break-inside-avoid overflow-hidden text-left"
            >
              <Image
                src={`https://res.cloudinary.com/dt70epmum/image/upload/w_1600,c_limit,f_auto,q_auto:best,dpr_auto/${photo.filename}`}
                alt={photo.title}
                width={1200}
                height={900}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                quality={90}
                className={`${aspectClass} h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03]`}
                style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
              />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-[rgba(0,0,0,0.3)]" />
          </button>
          );
        })}
      </div>
      <div className="mt-8 text-center text-sm text-white/60">
        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-none border border-[#b8963e] bg-[#b8963e] px-6 text-sm font-medium text-black transition hover:bg-[#c9a24a]"
          >
            Смотреть все работы
          </button>
        )}
        {hasMore && showAll && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-none border border-[#b8963e]/60 px-6 text-sm text-[#b8963e] transition hover:bg-[#b8963e]/12"
          >
            Свернуть
          </button>
        )}
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
