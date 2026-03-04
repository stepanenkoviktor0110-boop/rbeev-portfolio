'use client';

import { useEffect, useRef, useState } from 'react';

export default function Navigation() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLAnchorElement | null>(null);
  const linksRef = useRef<HTMLDivElement | null>(null);
  const [hideBrand, setHideBrand] = useState(false);

  useEffect(() => {
    const recalc = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const brandWidth = brandRef.current?.scrollWidth ?? 0;
      const linksWidth = linksRef.current?.scrollWidth ?? 0;
      const reservedGap = 24;
      setHideBrand(containerWidth > 0 && brandWidth + linksWidth + reservedGap > containerWidth);
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    if (containerRef.current) observer.observe(containerRef.current);
    if (brandRef.current) observer.observe(brandRef.current);
    if (linksRef.current) observer.observe(linksRef.current);
    window.addEventListener('resize', recalc);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-base/80 backdrop-blur">
      <div ref={containerRef} className="mx-auto flex max-w-[82.8rem] items-center justify-between gap-6 px-4 py-4">
        <a
          ref={brandRef}
          href="#"
          className={[
            'font-serif text-xl text-accent',
            hideBrand ? 'hidden' : 'max-[360px]:hidden',
          ].join(' ')}
        >
          Ваш фотограф — Рамазан Беев
        </a>
        <div ref={linksRef} className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-white/80">
          <a href="#gallery">Галерея</a>
          <a href="#about">Обо мне</a>
          <a href="#how-it-works">Как всё устроено</a>
          <a href="#contacts">Контакты</a>
        </div>
      </div>
    </nav>
  );
}
