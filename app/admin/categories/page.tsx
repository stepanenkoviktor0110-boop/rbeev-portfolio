'use client';

import { useEffect, useState } from 'react';
import { displayCategoryName } from '@/lib/categoryLabel';

type Category = { id: number; name: string; sortOrder: number };

type ApiErrorPayload = {
  error?: string;
  photoCount?: number;
  requiresConfirmation?: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    if (!res.ok) return;
    setCategories(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
      alert(payload.error || 'Не удалось создать категорию');
      return;
    }
    const created = (await res.json()) as Category;
    setCategories((prev) => [...prev, created]);
    setName('');
  };

  const saveEdit = async (id: number) => {
    const trimmedName = editingName.trim();
    if (!trimmedName) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: trimmedName }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
        alert(payload.error || 'Не удалось сохранить категорию');
        return;
      }
      const updated = (await res.json()) as Category;
      setCategories((prev) => prev.map((item) => (item.id === id ? { ...item, name: updated.name } : item)));
      setEditingId(null);
      setEditingName('');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (id: number, direction: 'up' | 'down') => {
    setBusyId(id);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, direction }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
        alert(payload.error || 'Не удалось изменить порядок');
        return;
      }
      setCategories((prev) => {
        const next = [...prev];
        const index = next.findIndex((item) => item.id === id);
        if (index < 0) return prev;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return prev;
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить категорию?')) return;
    setBusyId(id);
    try {
      const doDelete = async (force = false) =>
        fetch('/api/categories', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, force }),
        });

      let res = await doDelete(false);
      if (res.status === 409) {
        const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
        if (payload.requiresConfirmation) {
          const ok = confirm(
            `В этой категории ${payload.photoCount ?? 0} фото. Удаление может завершиться ошибкой из-за связанных данных. Продолжить?`
          );
          if (!ok) return;
          res = await doDelete(true);
        }
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
        alert(payload.error || 'Не удалось удалить категорию');
        return;
      }
      setCategories((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-accent">Категории</h1>

      <form onSubmit={add} className="card flex gap-2 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новая категория"
          className="flex-1 rounded-none bg-white/10 px-3 py-2"
          required
        />
        <button className="rounded-none bg-accent px-4 py-2 text-black">Добавить</button>
      </form>

      <div className="space-y-2">
        {categories.map((c, index) => (
          <div key={c.id} className="card flex items-center justify-between gap-3 p-3">
            {editingId === c.id ? (
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full rounded-none bg-white/10 px-3 py-2"
                autoFocus
              />
            ) : (
              <span>{displayCategoryName(c.name)}</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => move(c.id, 'up')}
                disabled={index === 0 || busyId === c.id}
                className="rounded-none border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
                title="Переместить вверх"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(c.id, 'down')}
                disabled={index === categories.length - 1 || busyId === c.id}
                className="rounded-none border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
                title="Переместить вниз"
              >
                ↓
              </button>

              {editingId === c.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => saveEdit(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-none border border-accent/40 px-3 py-1 text-xs text-accent"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingName('');
                    }}
                    className="rounded-none border border-white/15 px-3 py-1 text-xs"
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(c.id);
                    setEditingName(c.name);
                  }}
                  className="rounded-none border border-white/15 px-3 py-1 text-xs"
                >
                  Редактировать
                </button>
              )}

              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={busyId === c.id}
                className="rounded-none border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-200 disabled:opacity-40"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
