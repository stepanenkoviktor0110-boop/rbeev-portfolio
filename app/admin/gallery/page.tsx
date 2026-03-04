'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { displayCategoryName } from '@/lib/categoryLabel';

type Category = { id: number; name: string };
type Photo = {
  id: number;
  title: string;
  imageUrl: string;
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
const MAX_BATCH_FILES = 10;
type FolderImportPhase = 'prepare' | 'transfer' | 'db' | 'done';

const PhotoCard = memo(
  function PhotoCard({ photo, categories, onSaveField, onOpenFocal, onRemove }: PhotoCardProps) {
    return (
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.imageUrl}
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
  const [importingFolder, setImportingFolder] = useState(false);
  const [progress, setProgress] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [folderProgressPercent, setFolderProgressPercent] = useState(0);
  const [folderProgressText, setFolderProgressText] = useState('');
  const [folderImportPhase, setFolderImportPhase] = useState<FolderImportPhase>('prepare');
  const [folderTransferDone, setFolderTransferDone] = useState(0);
  const [folderTransferTotal, setFolderTransferTotal] = useState(0);
  const [folderDbDone, setFolderDbDone] = useState(0);
  const [folderUrl, setFolderUrl] = useState('');
  const [editing, setEditing] = useState<Photo | null>(null);
  const [tempFocal, setTempFocal] = useState<{ x: number; y: number } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [repairingUrls, setRepairingUrls] = useState(false);
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

  const applyFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) {
      setSelectedFiles([]);
      return;
    }

    const next = Array.from(files)
      .filter((file) => /^image\/(png|jpeg|webp)$/i.test(file.type))
      .slice(0, MAX_BATCH_FILES);

    setSelectedFiles(next);

    if (fileRef.current) {
      const dt = new DataTransfer();
      next.forEach((file) => dt.items.add(file));
      fileRef.current.files = dt.files;
    }
  }, []);

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const files = selectedFiles.length > 0 ? selectedFiles : Array.from(fileRef.current?.files || []);
    if (files.length === 0) return;

    if (files.length > MAX_BATCH_FILES) {
      alert(`Можно загрузить от 1 до ${MAX_BATCH_FILES} файлов за раз`);
      return;
    }

    const categoryId = new FormData(form).get('categoryId');
    setUploading(true);
    setUploadPercent(0);
    let done = 0;
    const queue = [...files];
    const errors: string[] = [];
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0) || 1;
    const uploadedByFile = new Map<string, number>();

    const recalcUploadPercent = () => {
      const loaded = Array.from(uploadedByFile.values()).reduce((sum, value) => sum + value, 0);
      setUploadPercent(Math.max(0, Math.min(100, Math.round((loaded / totalBytes) * 100))));
    };

    const uploadOne = async (file: File) =>
      new Promise<void>((resolve) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
        fd.append('categoryId', String(categoryId));
        fd.append('description', '');

        const key = `${file.name}:${file.size}:${Math.random().toString(36).slice(2, 8)}`;
        uploadedByFile.set(key, 0);
        recalcUploadPercent();

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/photos');

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          uploadedByFile.set(key, event.loaded);
          recalcUploadPercent();
        };

        xhr.onload = () => {
          uploadedByFile.set(key, file.size);
          recalcUploadPercent();

          if (xhr.status < 200 || xhr.status >= 300) {
            let message = 'Ошибка загрузки';
            try {
              const parsed = JSON.parse(xhr.responseText) as { error?: string };
              if (parsed?.error) message = parsed.error;
            } catch {
              // ignore parse errors
            }
            errors.push(`${file.name}: ${message}`);
          }

          done += 1;
          setProgress(`${done} / ${files.length}`);
          resolve();
        };

        xhr.onerror = () => {
          errors.push(`${file.name}: Сетевая ошибка`);
          done += 1;
          setProgress(`${done} / ${files.length}`);
          resolve();
        };

        xhr.send(fd);
      });

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
      setSelectedFiles([]);
      setPage(1);
      await loadPhotos(1);
      if (errors.length > 0) {
        alert(`Часть файлов не загрузилась:\n${errors.slice(0, 5).join('\n')}`);
      }
    } finally {
      setUploading(false);
      setUploadPercent(0);
      setProgress('');
    }
  };

  const importFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = folderUrl.trim();
    if (!url) return;

    setImportingFolder(true);
    setFolderProgressPercent(0);
    setFolderImportPhase('prepare');
    setFolderTransferDone(0);
    setFolderTransferTotal(0);
    setFolderDbDone(0);
    setFolderProgressText('Подготовка импорта...');

    try {
      const res = await fetch('/api/photos/import-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl: url }),
      });

      if (!res.ok) {
        let message = 'Ошибка импорта папки';
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          // ignore parse errors
        }
        alert(message);
        return;
      }

      const stream = res.body;
      if (!stream) {
        alert('Ошибка: сервер не передал поток прогресса');
        return;
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let transferTotal = 0;
      let transferDone = 0;
      let dbDone = 0;
      let finished = false;
      let importedCount = 0;
      let categoryName = 'Новая категория';
      let categoryCreated = false;

      const applyCombinedProgress = () => {
        const totalSteps = transferTotal > 0 ? transferTotal * 2 : 0;
        if (totalSteps <= 0) return;
        const completedSteps = Math.min(totalSteps, transferDone + dbDone + transferTotal);
        setFolderProgressPercent(Math.round((completedSteps / totalSteps) * 100));
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            try {
              const event = JSON.parse(line) as {
                type: 'progress' | 'done' | 'error';
                phase?: 'start' | 'transfer' | 'db';
                completed?: number;
                total?: number;
                message?: string;
                importedCount?: number;
                category?: { name?: string };
                categoryCreated?: boolean;
                error?: string;
              };

              if (event.type === 'progress') {
                if (event.phase === 'start') {
                  setFolderImportPhase('prepare');
                  setFolderProgressText(event.message || 'Начинаем импорт...');
                }
                if (event.phase === 'transfer') {
                  transferDone = event.completed || 0;
                  transferTotal = event.total || transferTotal;
                  setFolderImportPhase('transfer');
                  setFolderTransferDone(transferDone);
                  setFolderTransferTotal(transferTotal);
                  applyCombinedProgress();
                  setFolderProgressText(`Перенос файлов: ${transferDone} / ${transferTotal}`);
                }
                if (event.phase === 'db') {
                  dbDone = event.completed || 0;
                  setFolderImportPhase('db');
                  setFolderDbDone(dbDone);
                  setFolderTransferTotal(transferTotal);
                  applyCombinedProgress();
                  setFolderProgressText(`Сохранение в базу: ${dbDone} / ${transferTotal}`);
                }
              }

              if (event.type === 'done') {
                finished = true;
                importedCount = event.importedCount || 0;
                categoryName = event.category?.name || categoryName;
                categoryCreated = !!event.categoryCreated;
                setFolderImportPhase('done');
                setFolderTransferDone(transferTotal);
                setFolderTransferTotal(transferTotal);
                setFolderDbDone(transferTotal);
                setFolderProgressPercent(100);
                setFolderProgressText('Импорт завершен');
              }

              if (event.type === 'error') {
                throw new Error(event.error || 'Ошибка импорта папки');
              }
            } catch (error) {
              throw error;
            }
          }

          newlineIndex = buffer.indexOf('\n');
        }
      }

      if (!finished) {
        throw new Error('Импорт прерван до завершения');
      }

      setFolderUrl('');
      setPage(1);
      await Promise.all([loadPhotos(1), loadCategories()]);
      const createdText = categoryCreated ? 'создана' : 'использована существующая';
      alert(`Импортировано: ${importedCount}\nКатегория: ${categoryName} (${createdText})`);
    } catch (error) {
      alert((error as Error).message || 'Ошибка импорта папки');
    } finally {
      setImportingFolder(false);
      setFolderProgressText('');
      setFolderProgressPercent(0);
      setFolderImportPhase('prepare');
      setFolderTransferDone(0);
      setFolderTransferTotal(0);
      setFolderDbDone(0);
    }
  };

  const repairUrls = async () => {
    setRepairingUrls(true);
    try {
      const res = await fetch('/api/photos/repair-urls', { method: 'POST' });
      const body = (await res.json()) as { fixed?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(body.error || 'Ошибка');
      const msg = body.message || `Исправлено фото: ${body.fixed}`;
      alert(msg);
      if ((body.fixed ?? 0) > 0) {
        setPage(1);
        await loadPhotos(1);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRepairingUrls(false);
    }
  };

  const transferStageStatus =
    folderImportPhase === 'prepare'
      ? 'pending'
      : folderImportPhase === 'transfer'
        ? 'active'
        : 'done';
  const dbStageStatus =
    folderImportPhase === 'db' ? 'active' : folderImportPhase === 'done' ? 'done' : 'pending';
  const stageBadgeClass = (status: 'pending' | 'active' | 'done') => {
    if (status === 'done') return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30';
    if (status === 'active') return 'bg-accent/20 text-accent border border-accent/40';
    return 'bg-white/5 text-white/60 border border-white/10';
  };
  const stageStatusText = (status: 'pending' | 'active' | 'done') => {
    if (status === 'done') return 'Готово';
    if (status === 'active') return 'В процессе';
    return 'Ожидание';
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

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={upload}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('select, option, button, input, a, label')) return;
            fileRef.current?.click();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            const next = e.relatedTarget as Node | null;
            if (!next || !e.currentTarget.contains(next)) setIsDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragActive(false);
            applyFiles(e.dataTransfer.files);
          }}
          className={[
            'card grid cursor-pointer gap-3 border border-dashed p-6 transition',
            isDragActive ? 'border-accent bg-accent/5' : 'border-white/30 hover:border-white/45',
          ].join(' ')}
        >
          <h2 className="font-serif text-xl text-accent">Загрузка файлов (1-10)</h2>
          <div
            className={[
              'rounded-none p-4 text-sm transition',
              isDragActive ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/70',
            ].join(' ')}
          >
            <p className="font-medium">Перетащите фото сюда или нажмите для выбора</p>
            <p className="mt-1 text-xs text-white/60">JPG, PNG, WEBP. До 10 файлов за раз.</p>
            {selectedFiles.length > 0 && (
              <p className="mt-2 text-xs text-white">Выбрано файлов: {selectedFiles.length}</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp"
            required
            multiple
            onChange={(e) => applyFiles(e.currentTarget.files)}
            className="hidden"
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
            {uploading ? `Загрузка ${progress}...` : 'Загрузить в Яндекс.Диск'}          </button>
          {uploading && (
            <div className="space-y-2 rounded-none border border-white/10 bg-white/[0.03] p-3">
              <div className="h-2 w-full overflow-hidden rounded-none bg-white/10">
                <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${uploadPercent}%` }} />
              </div>
              <p className="text-xs text-white/70">{progress} ({uploadPercent}%)</p>
            </div>
          )}
        </form>

        <form onSubmit={importFolder} className="card grid gap-3 p-6">
          <h2 className="font-serif text-xl text-accent">Импорт папки по ссылке</h2>
          <input
            type="url"
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            required
            placeholder="https://disk.yandex.ru/..."
            className="rounded-none bg-white/10 px-3 py-2"
          />
          <p className="text-xs text-white/60">
            Категория создается по имени папки. Все импортированные фото автоматически отображаются в галерее сайта.
          </p>
          <button
            disabled={importingFolder}
            className="rounded-none bg-white/15 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {importingFolder ? 'Импорт...' : 'Импортировать папку'}
          </button>
          {importingFolder && (
            <div className="space-y-2 rounded-none border border-white/10 bg-white/[0.03] p-3">
              <div className="h-2 w-full overflow-hidden rounded-none bg-white/10">
                <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${folderProgressPercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <p className="text-white/70">{folderProgressText || 'Импорт...'}</p>
                <p className="text-white/80">{folderProgressPercent}%</p>
              </div>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between gap-2 rounded-none bg-white/5 px-2 py-1.5">
                  <div>
                    <p className="text-white">Перенос файлов</p>
                    <p className="text-white/60">
                      {folderTransferDone} / {folderTransferTotal}
                    </p>
                  </div>
                  <span className={`rounded-none px-2 py-0.5 text-[11px] ${stageBadgeClass(transferStageStatus)}`}>
                    {stageStatusText(transferStageStatus)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-none bg-white/5 px-2 py-1.5">
                  <div>
                    <p className="text-white">Сохранение в БД</p>
                    <p className="text-white/60">
                      {folderDbDone} / {folderTransferTotal}
                    </p>
                  </div>
                  <span className={`rounded-none px-2 py-0.5 text-[11px] ${stageBadgeClass(dbStageStatus)}`}>
                    {stageStatusText(dbStageStatus)}
                  </span>
                </div>
              </div>
            </div>
          )}
</form>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-white/70">
            Фото: <span className="text-white">{totalPhotos}</span>
            {loadingPhotos && <span className="ml-2 text-white/50">Обновление...</span>}
          </p>
          <button
            type="button"
            onClick={repairUrls}
            disabled={repairingUrls}
            className="rounded-none border border-white/20 px-3 py-1 text-xs text-white/60 hover:border-white/40 hover:text-white/80 disabled:opacity-40 transition"
            title="Починить URL фото, загруженных до обновления"
          >
            {repairingUrls ? 'Восстановление...' : 'Починить URL фото'}
          </button>
        </div>
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
                src={editing.imageUrl}
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
                src={editing.imageUrl}
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
