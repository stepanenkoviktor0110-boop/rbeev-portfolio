'use client';

import Image from 'next/image';
import { useCallback, useEffect } from 'react';

type Item = { id: number; title: string; filename: string };

interface Props {
  items: Item[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ items, index, onClose, onNavigate }: Props) {
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < items.length - 1;

  const goPrev = useCallback(() => { if (hasPrev) onNavigate(index! - 1); }, [hasPrev, index, onNavigate]);
  const goNext = useCallback(() => { if (hasNext) onNavigate(index! + 1); }, [hasNext, index, onNavigate]);

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

  if (index === null || !items[index]) return null;
  const item = items[index];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-2xl text-white backdrop-blur hover:bg-white/20 transition"
          aria-label="Предыдущее"
        >
          &#8249;
        </button>
      )}
      <Image
        src={`/uploads/${item.filename}`}
        alt={item.title}
        width={1200}
        height={900}
        className="max-h-[90vh] w-auto rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-2xl text-white backdrop-blur hover:bg-white/20 transition"
          aria-label="Следующее"
        >
          &#8250;
        </button>
      )}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-white backdrop-blur hover:bg-white/20 transition"
      >
        ✕
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-white font-medium">{item.title}</p>
        <p className="text-sm text-white/50">{index + 1} / {items.length}</p>
      </div>
    </div>
  );
}
