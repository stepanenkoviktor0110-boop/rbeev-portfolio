const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const LIST_PAGE_SIZE = 100;
const MAX_FOLDER_IMPORT_ITEMS = 300;

type DiskFile = {
  name: string;
  path: string;
  mime_type?: string;
};

type UploadResult = {
  imageUrl: string;
  storageKey: string;
};

type FolderImportProgress = {
  phase: 'transfer';
  completed: number;
  total: number;
};

function getDiskToken() {
  const token = process.env.YANDEX_DISK_TOKEN?.trim();
  if (!token) throw new Error('YANDEX_DISK_TOKEN is not configured');
  return token;
}

function getDiskBaseDir() {
  const base = (process.env.YANDEX_DISK_BASE_DIR || '/site-gallery').trim();
  if (/^(app:|disk:)\//i.test(base)) {
    return base.replace(/\/+$/, '');
  }
  const normalized = base.startsWith('/') ? base : `/${base}`;
  return normalized.replace(/\/+$/, '') || '/site-gallery';
}

function authHeaders() {
  return {
    Authorization: `OAuth ${getDiskToken()}`,
  };
}

function normalizeResourcePath(path: string) {
  return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
}

function sanitizeFileName(name: string) {
  const fallback = `photo-${Date.now()}`;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  const noExt = trimmed.replace(/\.[^.]+$/, '');
  const safe = noExt.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim();
  return safe || fallback;
}

function inferExtension(name: string, mimeType?: string) {
  const direct = name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  if (direct) return `.${direct}`;
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function isAllowedImageBuffer(buffer: Buffer) {
  if (buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  return isJpeg || isPng || isWebp;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string; error?: string; description?: string };
      message = body.description || body.message || body.error || message;
    } catch {
      // ignore json parse errors
    }
    throw new Error(`Yandex Disk API error: ${message}`);
  }
  return (await res.json()) as T;
}

async function getUploadUrl(path: string) {
  const url = `${YANDEX_API_BASE}/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`;
  const payload = await requestJson<{ href: string }>(url, { headers: authHeaders() });
  if (!payload.href) throw new Error('Yandex Disk did not return upload URL');
  return payload.href;
}

async function uploadBinary(uploadUrl: string, buffer: Buffer, contentType: string) {
  const payload = new Uint8Array(buffer);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType || 'application/octet-stream' },
    body: payload,
  });
  if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
}

async function publishResource(path: string) {
  const url = `${YANDEX_API_BASE}/resources/publish?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { method: 'PUT', headers: authHeaders() });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Could not publish resource, status ${res.status}`);
  }
}

async function getResource(path: string) {
  const fields = ['public_url', 'file', 'name', 'path'].join(',');
  const url = `${YANDEX_API_BASE}/resources?path=${encodeURIComponent(path)}&fields=${encodeURIComponent(fields)}`;
  return requestJson<{ public_url?: string; file?: string; name?: string; path?: string }>(url, {
    headers: authHeaders(),
  });
}

function buildStorageKey(originalName: string, mimeType?: string) {
  const safeBase = sanitizeFileName(originalName);
  const ext = inferExtension(originalName, mimeType);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const filename = `${stamp}-${rand}-${safeBase}${ext}`;
  return normalizeResourcePath(`${getDiskBaseDir()}/${filename}`);
}

async function uploadBufferToDisk(buffer: Buffer, originalName: string, mimeType?: string): Promise<UploadResult> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) throw new Error('Файл больше 10MB');
  if (!isAllowedImageBuffer(buffer)) throw new Error('Неверный формат файла');

  const storageKey = buildStorageKey(originalName, mimeType);
  const uploadUrl = await getUploadUrl(storageKey);
  await uploadBinary(uploadUrl, buffer, mimeType || 'application/octet-stream');
  await publishResource(storageKey);

  const resource = await getResource(storageKey);
  const imageUrl = resource.file || resource.public_url;
  if (!imageUrl) throw new Error('Не удалось получить публичную ссылку на файл');

  return { imageUrl, storageKey };
}

export async function uploadImageToYandexDisk(file: File): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadBufferToDisk(buffer, file.name, file.type);
}

export async function deleteYandexDiskResource(storageKey: string): Promise<void> {
  if (!storageKey) return;

  const path = normalizeResourcePath(storageKey);
  const url = `${YANDEX_API_BASE}/resources?path=${encodeURIComponent(path)}&permanently=true`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (![202, 204, 404].includes(res.status)) {
    throw new Error(`Delete failed with status ${res.status}`);
  }
}

function isImageItem(file: DiskFile) {
  const mime = (file.mime_type || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

async function getPublicFolderMeta(publicKey: string) {
  const fields = ['name', 'type', '_embedded.items.name', '_embedded.items.type', '_embedded.items.path', '_embedded.items.mime_type'].join(',');
  const url =
    `${YANDEX_API_BASE}/public/resources?public_key=${encodeURIComponent(publicKey)}` +
    `&limit=${LIST_PAGE_SIZE}&offset=0&fields=${encodeURIComponent(fields)}`;

  return requestJson<{
    name?: string;
    type?: string;
    _embedded?: { items?: Array<{ name?: string; type?: string; path?: string; mime_type?: string }> };
  }>(url, { headers: authHeaders() });
}

async function listPublicFolderFiles(publicKey: string): Promise<DiskFile[]> {
  const files: DiskFile[] = [];
  let offset = 0;

  while (offset < MAX_FOLDER_IMPORT_ITEMS) {
    const fields = ['_embedded.items.name', '_embedded.items.type', '_embedded.items.path', '_embedded.items.mime_type'].join(',');
    const url =
      `${YANDEX_API_BASE}/public/resources?public_key=${encodeURIComponent(publicKey)}` +
      `&limit=${LIST_PAGE_SIZE}&offset=${offset}&fields=${encodeURIComponent(fields)}`;
    const payload = await requestJson<{
      _embedded?: { items?: Array<{ name?: string; type?: string; path?: string; mime_type?: string }> };
    }>(url, { headers: authHeaders() });

    const items = payload._embedded?.items ?? [];
    for (const item of items) {
      if (item.type !== 'file' || !item.name || !item.path) continue;
      const file: DiskFile = { name: item.name, path: item.path, mime_type: item.mime_type };
      if (isImageItem(file)) files.push(file);
    }

    if (items.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return files;
}

async function getPublicDownloadUrl(publicKey: string, path: string) {
  const url =
    `${YANDEX_API_BASE}/public/resources/download?public_key=${encodeURIComponent(publicKey)}` +
    `&path=${encodeURIComponent(path)}`;
  const payload = await requestJson<{ href?: string }>(url, { headers: authHeaders() });
  if (!payload.href) throw new Error('Не удалось получить ссылку на скачивание файла из папки');
  return payload.href;
}

async function downloadPublicFile(publicKey: string, path: string) {
  try {
    const href = await getPublicDownloadUrl(publicKey, path);
    const response = await fetch(href);
    if (!response.ok) throw new Error(`Ошибка скачивания файла из папки (${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  } catch {
    const fallbackPath = path.startsWith('/') ? path : `/${path.split('/').pop() || ''}`;
    const href = await getPublicDownloadUrl(publicKey, fallbackPath);
    const response = await fetch(href);
    if (!response.ok) throw new Error(`Ошибка скачивания файла из папки (${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  }
}

function titleFromName(name: string) {
  return sanitizeFileName(name).replace(/[_-]/g, ' ');
}

export async function importPublicFolderFromYandexDisk(
  publicKey: string,
  options?: { onProgress?: (progress: FolderImportProgress) => void }
) {
  const meta = await getPublicFolderMeta(publicKey);
  if (meta.type !== 'dir') throw new Error('Ссылка должна вести на папку Яндекс.Диска');

  const folderName = (meta.name || '').trim() || `folder-${Date.now()}`;
  const files = await listPublicFolderFiles(publicKey);
  if (files.length === 0) throw new Error('В папке не найдено изображений');

  const imported: Array<UploadResult & { title: string }> = [];
  const total = files.length;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const binary = await downloadPublicFile(publicKey, file.path);
    const uploaded = await uploadBufferToDisk(binary, file.name, file.mime_type);
    imported.push({ ...uploaded, title: titleFromName(file.name) });
    options?.onProgress?.({ phase: 'transfer', completed: index + 1, total });
  }

  return {
    folderName,
    imported,
  };
}
