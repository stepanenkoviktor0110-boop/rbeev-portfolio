'use client';

import { useEffect, useState } from 'react';

type Review = {
  id: number;
  authorName: string;
  text: string;
  sortOrder: number;
  isPublished: boolean;
};

type ApiError = { error?: string };

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newText, setNewText] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingAuthorName, setEditingAuthorName] = useState('');
  const [editingText, setEditingText] = useState('');

  const load = async () => {
    const res = await fetch('/api/reviews', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as Review[];
    setReviews(data);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const authorName = newAuthorName.trim();
    const text = newText.trim();
    if (!authorName || !text) return;

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, text }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as ApiError;
      alert(payload.error || 'Не удалось создать отзыв');
      return;
    }

    const created = (await res.json()) as Review;
    setReviews((prev) => [...prev, created]);
    setNewAuthorName('');
    setNewText('');
  };

  const save = async (id: number) => {
    const authorName = editingAuthorName.trim();
    const text = editingText.trim();
    if (!authorName || !text) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, text }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        alert(payload.error || 'Не удалось сохранить отзыв');
        return;
      }
      const updated = (await res.json()) as Review;
      setReviews((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      setEditingAuthorName('');
      setEditingText('');
    } finally {
      setBusyId(null);
    }
  };

  const togglePublished = async (review: Review) => {
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !review.isPublished }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        alert(payload.error || 'Не удалось обновить статус');
        return;
      }
      const updated = (await res.json()) as Review;
      setReviews((prev) => prev.map((item) => (item.id === review.id ? updated : item)));
    } finally {
      setBusyId(null);
    }
  };

  const move = async (review: Review, direction: 'up' | 'down') => {
    const index = reviews.findIndex((item) => item.id === review.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= reviews.length) return;

    const target = reviews[targetIndex];
    setBusyId(review.id);
    try {
      const [first, second] = await Promise.all([
        fetch(`/api/reviews/${review.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        fetch(`/api/reviews/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: review.sortOrder }),
        }),
      ]);

      if (!first.ok || !second.ok) {
        alert('Не удалось изменить порядок отзывов');
        return;
      }

      setReviews((prev) => {
        const next = [...prev];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить отзыв?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        alert(payload.error || 'Не удалось удалить отзыв');
        return;
      }
      setReviews((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-accent">Отзывы</h1>

      <form onSubmit={add} className="card grid gap-3 p-4">
        <input
          value={newAuthorName}
          onChange={(e) => setNewAuthorName(e.target.value)}
          placeholder="Имя автора"
          className="rounded-none bg-white/10 px-3 py-2"
          required
        />
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Текст отзыва"
          className="min-h-24 rounded-none bg-white/10 px-3 py-2"
          required
        />
        <button className="w-fit rounded-none bg-accent px-4 py-2 text-black">Добавить отзыв</button>
      </form>

      <div className="space-y-2">
        {reviews.map((review, index) => (
          <div key={review.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.08em] text-white/50">ID: {review.id}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(review, 'up')}
                  disabled={index === 0 || busyId === review.id}
                  className="rounded-none border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(review, 'down')}
                  disabled={index === reviews.length - 1 || busyId === review.id}
                  className="rounded-none border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => togglePublished(review)}
                  disabled={busyId === review.id}
                  className="rounded-none border border-white/15 px-3 py-1 text-xs"
                >
                  {review.isPublished ? 'Скрыть' : 'Опубликовать'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    editingId === review.id
                      ? setEditingId(null)
                      : (setEditingId(review.id), setEditingAuthorName(review.authorName), setEditingText(review.text))
                  }
                  className="rounded-none border border-white/15 px-3 py-1 text-xs"
                >
                  {editingId === review.id ? 'Отмена' : 'Редактировать'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(review.id)}
                  disabled={busyId === review.id}
                  className="rounded-none border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-200 disabled:opacity-40"
                >
                  Удалить
                </button>
              </div>
            </div>

            {editingId === review.id ? (
              <div className="grid gap-2">
                <input
                  value={editingAuthorName}
                  onChange={(e) => setEditingAuthorName(e.target.value)}
                  className="rounded-none bg-white/10 px-3 py-2"
                />
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="min-h-24 rounded-none bg-white/10 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => save(review.id)}
                  disabled={busyId === review.id}
                  className="w-fit rounded-none border border-accent/40 px-3 py-1 text-xs text-accent disabled:opacity-40"
                >
                  Сохранить
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-accent/85">{review.authorName}</p>
                <p className="whitespace-pre-wrap text-sm text-white/80">{review.text}</p>
                <p className="text-xs text-white/45">{review.isPublished ? 'Опубликован' : 'Скрыт'}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
