'use client';

import { useEffect, useRef, useState } from 'react';

export default function Navigation() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLAnchorElement | null>(null);
  const linksRef = useRef<HTMLDivElement | null>(null);
  const brandNaturalWidthRef = useRef(0);
  const [hideBrand, setHideBrand] = useState(false);

  useEffect(() => {
    const getLinksPreferredWidth = () => {
      const linksEl = linksRef.current;
      if (!linksEl) return 0;
      const style = window.getComputedStyle(linksEl);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      const items = Array.from(linksEl.children) as HTMLElement[];
      if (items.length === 0) return 0;
      const itemsWidth = items.reduce((sum, item) => sum + item.offsetWidth, 0);
      return itemsWidth + gap * (items.length - 1);
    };

    const hasWrappedLinks = () => {
      const linksEl = linksRef.current;
      if (!linksEl) return false;
      const items = Array.from(linksEl.children) as HTMLElement[];
      if (items.length < 2) return false;
      const firstTop = items[0].offsetTop;
      return items.some((item) => Math.abs(item.offsetTop - firstTop) > 1);
    };

    const recalc = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const measuredBrandWidth = brandRef.current?.scrollWidth ?? 0;
      if (measuredBrandWidth > 0) {
        brandNaturalWidthRef.current = measuredBrandWidth;
      }
      const brandWidth = brandNaturalWidthRef.current;
      const linksWidth = getLinksPreferredWidth();
      const reservedGap = 24;
      const requiredWidth = brandWidth + linksWidth + reservedGap;
      const wrapped = hasWrappedLinks();
      const shouldHideNow = containerWidth > 0 && (requiredWidth > containerWidth || wrapped);

      // Hysteresis: once hidden, show brand back only when there is extra room.
      const showAgainBuffer = 40;
      setHideBrand((prev) => {
        if (!prev) return shouldHideNow;
        return containerWidth < requiredWidth + showAgainBuffer;
      });
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    if (containerRef.current) observer.observe(containerRef.current);
    if (brandRef.current) observer.observe(brandRef.current);
    if (linksRef.current) observer.observe(linksRef.current);
    window.addEventListener('resize', recalc);
    document.fonts?.ready.then(recalc).catch(() => undefined);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-base/80 backdrop-blur">
      <div
        ref={containerRef}
        className="mx-auto flex min-h-[5.2rem] max-w-[82.8rem] items-center justify-center gap-6 px-4 py-[1.3rem] md:min-h-0 md:justify-between md:py-4"
      >
        <a
          ref={brandRef}
          href="#"
          className={[
            'shrink-0 font-serif text-xl text-accent',
            hideBrand ? 'hidden' : 'max-[360px]:hidden',
          ].join(' ')}
        >
          Ваш фотограф — Рамазан Беев
        </a>
        <div
          ref={linksRef}
          className="flex flex-wrap justify-center gap-x-[0.9rem] gap-y-[0.3rem] text-center text-[0.86rem] text-white/80 sm:gap-x-4 sm:text-sm md:justify-end md:text-right"
        >
          <a href="#gallery">Галерея</a>
          <a href="#about">Обо мне</a>
          <a href="#how-it-works">Как всё устроено</a>
          <a href="#contacts">Контакты</a>
        </div>
      </div>
    </nav>
  );
}
