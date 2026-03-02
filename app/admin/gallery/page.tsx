'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { displayCategoryName } from '@/lib/categoryLabel';

type Category = { id: number; name: string };
type Photo = {
  id: number;
  title: string;
  filename: string;
  categoryId: number;
  description: string | null;
  sortOrder: number;
  focalX: number;
  focalY: number;
  showInGallery: boolean;
  showInSlideshow: boolean;
  showInAbout: boolean;
};

type PaginatedPhotosResponse = {
  items: Photo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PhotoCardProps = {
  photo: Photo;
  categories: Category[];
  onSaveField: (photo: Photo, field: string, value: unknown) => void;
  onOpenFocal: (photo: Photo) => void;
  onRemove: (id: number) => void;
};

const PAGE_SIZE = 24;
const MAX_PARALLEL_UPLOADS = 3;

const PhotoCard = memo(
  function PhotoCard({ photo, categories, onSaveField, onOpenFocal, onRemove }: PhotoCardProps) {
    return (
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://res.cloudinary.com/dt70epmum/image/upload/w_320,h_220,c_fill,f_auto,q_auto/${photo.filename}`}
          alt={photo.title}
          className="h-48 w-full object-cover"
          style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
          loading="lazy"
          decoding="async"
        />
        <div className="space-y-2 p-3">
          <input
            className="w-full rounded-none bg-white/10 px-2 py-1 text-sm"
            defaultValue={photo.title}
            onBlur={(e) => {
              if (e.target.value !== photo.title) onSaveField(photo, 'title', e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
          <select
            className="w-full rounded-none bg-white/10 px-2 py-1 text-sm"
            value={photo.categoryId}
            onChange={(e) => onSaveField(photo, 'categoryId', Number(e.target.value))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-neutral-800 text-white">
                {displayCategoryName(c.name)}
              </option>
            ))}
          </select>

          <div className="grid gap-2 rounded-none bg-white/5 p-2 text-xs sm:grid-cols-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!photo.showInGallery}
                onChange={(e) => onSaveField(photo, 'showInGallery', e.target.checked)}
              />
              <span>Галерея</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!photo.showInSlideshow}
                onChange={(e) => onSaveField(photo, 'showInSlideshow', e.target.checked)}
              />
              <span>Слайдшоу</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!photo.showInAbout}
                onChange={(e) => onSaveField(photo, 'showInAbout', e.target.checked)}
              />
              <span>Обо мне</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenFocal(photo)}
              className="flex-1 rounded-none bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
            >
              Фокус
            </button>
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              className="rounded-none bg-red-500/80 px-3 py-1 text-sm"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => prev.photo === next.photo && prev.categories === next.categories
);

export default function AdminGalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [editing, setEditing] = useState<Photo | null>(null);
  const [tempFocal, setTempFocal] = useState<{ x: number; y: number } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/categories');
    if (res.ok) setCategories(await res.json());
  }, []);

  const loadPhotos = useCallback(async (targetPage: number) => {
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/photos?page=${targetPage}&pageSize=${PAGE_SIZE}`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = (await res.json()) as Photo[] | PaginatedPhotosResponse;
      if (Array.isArray(data)) {
        setPhotos(data);
        setTotalPhotos(data.length);
        setTotalPages(1);
        return;
      }

      setPhotos(data.items);
      setTotalPhotos(data.total);
      setTotalPages(Math.max(1, data.totalPages || Math.ceil(data.total / PAGE_SIZE)));
      if (data.page !== targetPage) setPage(data.page);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadPhotos(page);
  }, [loadPhotos, page]);

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;

    const categoryId = new FormData(form).get('categoryId');
    setUploading(true);
    let done = 0;
    const queue = Array.from(files);

    const uploadOne = async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
      fd.append('categoryId', String(categoryId));
      fd.append('description', '');
      await fetch('/api/photos', { method: 'POST', body: fd });
      done++;
      setProgress(`${done} / ${files.length}`);
    };

    try {
      const workers = Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, queue.length) }, async () => {
        while (queue.length > 0) {
          const nextFile = queue.shift();
          if (!nextFile) return;
          await uploadOne(nextFile);
        }
      });

      await Promise.all(workers);
      form.reset();
      setPage(1);
      await loadPhotos(1);
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  const saveField = async (photo: Photo, field: string, value: unknown) => {
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      alert('Ошибка: ' + (await res.text()));
      return;
    }
    const updated = await res.json();
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, ...updated } : p)));
  };

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
    if (!res.ok) {
      alert('Ошибка сохранения: ' + (await res.text()));
      return;
    }
    const updated = await res.json();
    setPhotos((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...updated } : p)));
    setEditing(null);
    setTempFocal(null);
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить фото?')) return;

    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Ошибка удаления');
      return;
    }

    const nextCount = Math.max(0, totalPhotos - 1);
    const nextTotalPages = Math.max(1, Math.ceil(nextCount / PAGE_SIZE));
    const nextPage = Math.min(page, nextTotalPages);

    setTotalPhotos(nextCount);
    setTotalPages(nextTotalPages);
    if (nextPage !== page) {
      setPage(nextPage);
      return;
    }
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));

    if (photos.length === 1 && nextPage > 1) {
      setPage((p) => Math.max(1, p - 1));
      return;
    }

    if (photos.length === 1) {
      await loadPhotos(nextPage);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl text-accent">Управление галереей</h1>

      <form onSubmit={upload} className="card grid gap-3 p-6">
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          multiple
          className="rounded-none bg-white/10 p-2"
        />
        <select name="categoryId" required className="rounded-none bg-white/10 px-3 py-2">
          {categories.map((c) => (
            <option key={c.id} value={c.id} className="bg-neutral-800 text-white">
              {displayCategoryName(c.name)}
            </option>
          ))}
        </select>
        <button
          disabled={uploading}
          className="rounded-none bg-accent px-4 py-2 font-medium text-black disabled:opacity-50"
        >
          {uploading ? `Загрузка ${progress}...` : 'Загрузить'}
        </button>
      </form>

      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
        <p className="text-white/70">
          Фото: <span className="text-white">{totalPhotos}</span>
          {loadingPhotos && <span className="ml-2 text-white/50">Обновление...</span>}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loadingPhotos}
            className="ui-button"
          >
            ← Назад
          </button>
          <p className="min-w-24 text-center text-white/70">
            {page} / {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loadingPhotos}
            className="ui-button"
          >
            Вперёд →
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            categories={categories}
            onSaveField={saveField}
            onOpenFocal={openFocalEditor}
            onRemove={remove}
          />
        ))}
      </div>

      {!loadingPhotos && photos.length === 0 && (
        <div className="card p-4 text-white/60">На этой странице нет фото</div>
      )}

      {editing && tempFocal && (
        <div
          className="fixed inset-0 z-50 flex bg-black/95"
          onClick={() => {
            setEditing(null);
            setTempFocal(null);
          }}
        >
          <div
            className="flex flex-1 flex-col overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-serif text-xl text-accent">{editing.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setTempFocal(null);
                }}
                className="rounded-none bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-sm text-white/60">Кликните на важную часть фото</p>
            <div className="relative flex items-start justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://res.cloudinary.com/dt70epmum/image/upload/f_auto,q_auto/${editing.filename}`}
                alt={editing.title}
                className="max-h-[80vh] w-auto max-w-full cursor-crosshair rounded-none"
                onClick={handleFocalClick}
              />
              <div
                className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-none border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5),0_0_20px_rgba(200,184,145,0.5)]"
                style={{
                  left: `${tempFocal.x}%`,
                  top: `${tempFocal.y}%`,
                  backgroundColor: 'rgba(200,184,145,0.7)',
                }}
              />
            </div>
          </div>
          <div
            className="flex w-80 shrink-0 flex-col items-center justify-center gap-4 border-l border-white/10 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-white/60">Превью на сайте:</p>
            <div className="w-full overflow-hidden rounded-none" style={{ height: '200px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://res.cloudinary.com/dt70epmum/image/upload/f_auto,q_auto/${editing.filename}`}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: `${tempFocal.x}% ${tempFocal.y}%` }}
              />
            </div>
            <button
              type="button"
              onClick={saveFocal}
              className="w-full rounded-none bg-accent px-4 py-2.5 font-medium text-black"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setTempFocal(null);
              }}
              className="w-full rounded-none bg-white/10 px-4 py-2.5 transition hover:bg-white/20"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


