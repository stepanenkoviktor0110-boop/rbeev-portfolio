'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type Item = { id: number; title: string; imageUrl: string };

interface Props {
  items: Item[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ items, index, onClose, onNavigate }: Props) {
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < items.length - 1;
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const [arrowPos, setArrowPos] = useState<{ leftX: number; rightX: number }>({ leftX: 24, rightX: 24 });

  const goPrev = useCallback(() => {
    if (!hasPrev || index === null) return;
    onNavigate(index - 1);
  }, [hasPrev, index, onNavigate]);
  const goNext = useCallback(() => {
    if (!hasNext || index === null) return;
    onNavigate(index + 1);
  }, [hasNext, index, onNavigate]);

  useEffect(() => {
    if (index === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, onClose, goPrev, goNext]);

  useEffect(() => {
    if (index === null) return;
    const recalcArrowPos = () => {
      const rect = imageWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const offset = 20;
      setArrowPos({
        leftX: Math.round(rect.left - offset),
        rightX: Math.round(rect.right + offset),
      });
    };
    recalcArrowPos();
    window.addEventListener('resize', recalcArrowPos);
    return () => window.removeEventListener('resize', recalcArrowPos);
  }, [index, items.length]);

  if (index === null || !items[index]) return null;
  const item = items[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      }}
      onTouchEnd={(e) => {
        const startX = touchStartX.current;
        const startY = touchStartY.current;
        if (startX === null || startY === null) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) goNext();
          if (dx > 0) goPrev();
        }
        touchStartX.current = null;
        touchStartY.current = null;
      }}
    >
      {hasPrev && (
        <button
          type="button"
          aria-label="Предыдущее фото"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="group absolute inset-y-0 left-0 z-10 w-1/4 bg-transparent"
        />
      )}

      {hasNext && (
        <button
          type="button"
          aria-label="Следующее фото"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="group absolute inset-y-0 right-0 z-10 w-1/4 bg-transparent"
        />
      )}

      {hasPrev && (
        <span
          className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-5xl font-thin leading-none text-white/40"
          style={{ left: `${arrowPos.leftX}px` }}
          aria-hidden="true"
        >
          &#8249;
        </span>
      )}

      {hasNext && (
        <span
          className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-5xl font-thin leading-none text-white/40"
          style={{ left: `${arrowPos.rightX}px` }}
          aria-hidden="true"
        >
          &#8250;
        </span>
      )}

      <div
        ref={imageWrapRef}
        className="inline-block"
        onClick={(e) => {
          e.stopPropagation();
          if (hasNext) {
            goNext();
            return;
          }
          onClose();
        }}
      >
        <Image
          src={item.imageUrl}
          alt={item.title}
          width={1800}
          height={1200}
          sizes="90vw"
          quality={80}
          className="max-h-[90vh] w-auto rounded-none object-contain"
          onLoad={() => {
            const rect = imageWrapRef.current?.getBoundingClientRect();
            if (!rect) return;
            const offset = 20;
            setArrowPos({
              leftX: Math.round(rect.left - offset),
              rightX: Math.round(rect.right + offset),
            });
          }}
        />
      </div>
    </div>
  );
}
