'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { displayCategoryName } from '@/lib/categoryLabel';
import { COOKIE_CONSENT_EVENT, loadSitePrefs, saveSitePrefs } from '@/lib/cookieConsent';
import Lightbox from './Lightbox';

type GalleryCategory = {
  id: number;
  name: string;
  sortOrder: number;
};

type GalleryPhoto = {
  id: number;
  title: string;
  imageUrl: string;
  categoryId: number;
  sortOrder: number;
  focalX: number;
  focalY: number;
};

const INITIAL_VISIBLE = 12;

export default function Gallery({ photos, categories }: { photos: GalleryPhoto[]; categories: GalleryCategory[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [openedIndex, setOpenedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const photoCategoryIds = useMemo(() => new Set(photos.map((photo) => photo.categoryId)), [photos]);

  const sortedCategories = useMemo(
    () =>
      [...categories]
        .filter((category) => photoCategoryIds.has(category.id))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [categories, photoCategoryIds]
  );

  const categoryOrder = useMemo(() => {
    const map = new Map<number, number>();
    sortedCategories.forEach((category, index) => {
      map.set(category.id, index);
    });
    return map;
  }, [sortedCategories]);

  const filtered = useMemo(() => {
    const base = !active ? photos : photos.filter((p) => p.categoryId === active);
    if (active) return base;
    return [...base].sort((a, b) => {
      const categoryScore = (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0);
      if (categoryScore !== 0) return categoryScore;
      return a.sortOrder - b.sortOrder || a.id - b.id;
    });
  }, [active, categoryOrder, photos]);

  const isAllCategory = active === null;

  useEffect(() => {
    const prefs = loadSitePrefs();
    if (prefs) {
      const nextActive =
        typeof prefs.galleryCategoryId === 'number' &&
        sortedCategories.some((c) => c.id === prefs.galleryCategoryId)
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
  }, [sortedCategories]);

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

  const visibleItems = isAllCategory
    ? filtered.slice(0, INITIAL_VISIBLE)
    : showAll
      ? filtered
      : filtered.slice(0, INITIAL_VISIBLE);
  const hasMore = filtered.length > INITIAL_VISIBLE;
  const hiddenCount = isAllCategory ? Math.max(0, filtered.length - INITIAL_VISIBLE) : 0;
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
        {sortedCategories.map((c) => (
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((photo) => {
          const indexInFiltered = filtered.findIndex((item) => item.id === photo.id);
          const aspectClass = aspectPattern[indexInFiltered % aspectPattern.length];
          return (
            <button
              key={photo.id}
              onClick={() => setOpenedIndex(indexInFiltered >= 0 ? indexInFiltered : null)}
              className="group relative block w-full overflow-hidden text-left"
            >
              <div className={`relative w-full overflow-hidden ${aspectClass}`}>
                <Image
                  src={photo.imageUrl}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  quality={72}
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
                />
              </div>
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-[rgba(0,0,0,0.3)]" />
            </button>
          );
        })}

        {hiddenCount > 0 && (
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center rounded-none border border-dashed border-accent/50 bg-accent/10 px-4 text-sm text-accent transition hover:bg-accent/15"
          >
            Еще {hiddenCount} фото
          </button>
        )}
      </div>

      <div className="mt-8 text-center text-sm text-white/60">
        {!isAllCategory && hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-none border border-[#b8963e] bg-[#b8963e] px-6 text-sm font-medium text-black transition hover:bg-[#c9a24a]"
          >
            Смотреть все работы
          </button>
        )}
        {!isAllCategory && hasMore && showAll && (
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
