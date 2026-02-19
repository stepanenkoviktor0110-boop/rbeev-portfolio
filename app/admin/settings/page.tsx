'use client';

import { useEffect, useState } from 'react';

interface Photo {
  id: number;
  filename: string;
  title: string;
}

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [heroPhotoIds, setHeroPhotoIds] = useState<number[]>([]);

  const load = async () => {
    const [settings, photosData] = await Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/photos').then((r) => r.json()),
    ]);
    setData(settings);
    setPhotos(photosData);
    try {
      setHeroPhotoIds(JSON.parse(settings.heroPhotoIds || '[]'));
    } catch {
      setHeroPhotoIds([]);
    }
  };

  useEffect(() => { load(); }, []);

  if (!data) return null;

  const toggleHeroPhoto = (id: number) => {
    setHeroPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...data, heroPhotoIds: JSON.stringify(heroPhotoIds) };
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    alert('Сохранено');
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setPassword('');
    alert('Пароль обновлён в сессии');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-accent">Настройки</h1>

      <form onSubmit={save} className="card space-y-6 p-6">
        {/* Text fields */}
        <div className="grid gap-3 md:grid-cols-2">
          {['heroTitle','heroSubtitle','aboutText','email','phone','telegram','whatsapp','instagram'].map((k) => (
            <input
              key={k}
              value={data[k] ?? ''}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
              placeholder={k}
              className="rounded bg-white/10 px-3 py-2"
            />
          ))}
        </div>

        {/* Hero background photo picker */}
        <div>
          <h2 className="mb-3 font-serif text-2xl text-accent">Фон главного экрана</h2>
          <p className="mb-4 text-sm text-white/60">
            Выберите фото из галереи — они будут плавно сменяться размытым фоном на главном экране.
          </p>
          {photos.length === 0 ? (
            <p className="text-white/40">Нет фотографий в галерее</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {photos.map((photo) => {
                const selected = heroPhotoIds.includes(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => toggleHeroPhoto(photo.id)}
                    className="group relative aspect-square overflow-hidden rounded-lg border-2 transition-all"
                    style={{ borderColor: selected ? 'var(--color-accent, #c9a84c)' : 'transparent' }}
                    title={photo.title}
                  >
                    <img
                      src={`/uploads/thumbs/${photo.filename}`}
                      onError={(e) => { (e.target as HTMLImageElement).src = `/uploads/${photo.filename}`; }}
                      alt={photo.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    {selected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <svg className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {heroPhotoIds.length > 0 && (
            <p className="mt-2 text-sm text-white/50">Выбрано: {heroPhotoIds.length} фото</p>
          )}
        </div>

        <button className="rounded bg-accent px-4 py-2 text-black">Сохранить</button>
      </form>

      <form onSubmit={changePassword} className="card max-w-md space-y-3 p-6">
        <h2 className="font-serif text-2xl">Смена пароля (текущая сессия)</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded bg-white/10 px-3 py-2"
          placeholder="Новый пароль"
        />
        <button className="rounded bg-accent px-4 py-2 text-black">Обновить</button>
      </form>
    </div>
  );
}
