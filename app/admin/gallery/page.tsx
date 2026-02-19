'use client';

import { useEffect, useRef, useState } from 'react';

type Category = { id: number; name: string };
type Photo = { id: number; title: string; filename: string; categoryId: number; description: string | null; sortOrder: number; focalX: number; focalY: number };

export default function AdminGalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [editing, setEditing] = useState<Photo | null>(null);
  const [tempFocal, setTempFocal] = useState<{ x: number; y: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [pRes, cRes] = await Promise.all([fetch('/api/photos'), fetch('/api/categories')]);
    if (pRes.ok) setPhotos(await pRes.json());
    if (cRes.ok) setCategories(await cRes.json());
  };
  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;
    const categoryId = new FormData(form).get('categoryId');
    setUploading(true);
    let done = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
      fd.append('categoryId', String(categoryId));
      fd.append('description', '');
      await fetch('/api/photos', { method: 'POST', body: fd });
      done++;
      setProgress(`${done} / ${files.length}`);
    }
    setUploading(false);
    setProgress('');
    form.reset();
    load();
  };

  // --- Save any field ---
  const saveField = async (photo: Photo, field: string, value: unknown) => {
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) { alert('Ошибка: ' + (await res.text())); return; }
    const updated = await res.json();
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, ...updated } : p)));
  };

  // --- Focal editor ---
  const openFocalEditor = (photo: Photo) => {
    setEditing(photo);
    setTempFocal({ x: photo.focalX, y: photo.focalY });
  };

  const handleFocalClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTempFocal({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
    });
  };

  const saveFocal = async () => {
    if (!editing || !tempFocal) return;
    const res = await fetch(`/api/photos/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focalX: tempFocal.x, focalY: tempFocal.y }),
    });
    if (!res.ok) { alert('Ошибка сохранения: ' + (await res.text())); return; }
    const updated = await res.json();
    setPhotos((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...updated } : p)));
    setEditing(null);
    setTempFocal(null);
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить фото?')) return;
    await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl text-accent">Управление галереей</h1>

      <form onSubmit={upload} className="card grid gap-3 p-6">
        <input ref={fileRef} type="file" name="file" accept="image/png,image/jpeg,image/webp" required multiple className="rounded bg-white/10 p-2" />
        <select name="categoryId" required className="rounded bg-white/10 px-3 py-2">
          {categories.map((c) => <option key={c.id} value={c.id} className="bg-neutral-800 text-white">{c.name}</option>)}
        </select>
        <button disabled={uploading} className="rounded bg-accent px-4 py-2 font-medium text-black disabled:opacity-50">
          {uploading ? `Загрузка ${progress}...` : 'Загрузить'}
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/uploads/thumbs/${p.filename}`}
              alt={p.title}
              className="h-48 w-full object-cover"
              style={{ objectPosition: `${p.focalX}% ${p.focalY}%` }}
            />
            <div className="space-y-2 p-3">
              <input
                className="w-full rounded bg-white/10 px-2 py-1 text-sm"
                defaultValue={p.title}
                onBlur={(e) => { if (e.target.value !== p.title) saveField(p, 'title', e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
              <select
                className="w-full rounded bg-white/10 px-2 py-1 text-sm"
                value={p.categoryId}
                onChange={(e) => saveField(p, 'categoryId', Number(e.target.value))}
              >
                {categories.map((c) => <option key={c.id} value={c.id} className="bg-neutral-800 text-white">{c.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => openFocalEditor(p)} className="flex-1 rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 transition">Фокус</button>
                <button onClick={() => remove(p.id)} className="rounded bg-red-500/80 px-3 py-1 text-sm">Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Focal Point Editor Modal */}
      {editing && tempFocal && (
        <div className="fixed inset-0 z-50 flex bg-black/95" onClick={() => { setEditing(null); setTempFocal(null); }}>
          <div className="flex flex-1 flex-col overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-serif text-xl text-accent">{editing.title}</h2>
              <button onClick={() => { setEditing(null); setTempFocal(null); }} className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20">✕</button>
            </div>
            <p className="mb-3 text-sm text-white/60">Кликните на важную часть фото</p>
            <div className="relative flex items-start justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/uploads/${editing.filename}`}
                alt={editing.title}
                className="max-h-[80vh] w-auto max-w-full cursor-crosshair rounded-lg"
                onClick={handleFocalClick}
              />
              <div
                className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5),0_0_20px_rgba(200,184,145,0.5)]"
                style={{ left: `${tempFocal.x}%`, top: `${tempFocal.y}%`, backgroundColor: 'rgba(200,184,145,0.7)' }}
              />
            </div>
          </div>
          <div className="flex w-80 shrink-0 flex-col items-center justify-center gap-4 border-l border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-white/60">Превью на сайте:</p>
            <div className="w-full overflow-hidden rounded-lg" style={{ height: '200px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/uploads/${editing.filename}`}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: `${tempFocal.x}% ${tempFocal.y}%` }}
              />
            </div>
            <button onClick={saveFocal} className="w-full rounded bg-accent px-4 py-2.5 font-medium text-black">Сохранить</button>
            <button onClick={() => { setEditing(null); setTempFocal(null); }} className="w-full rounded bg-white/10 px-4 py-2.5 hover:bg-white/20 transition">Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}
