import { NextRequest, NextResponse } from 'next/server';

const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';
const DOWNLOAD_URL_TTL_MS = 4 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

type DownloadCacheEntry = {
  url: string;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __yandexDownloadUrlCache: Map<string, DownloadCacheEntry> | undefined;
  // eslint-disable-next-line no-var
  var __yandexDownloadUrlInflight: Map<string, Promise<string>> | undefined;
}

const downloadUrlCache = global.__yandexDownloadUrlCache ?? new Map<string, DownloadCacheEntry>();
const downloadUrlInflight = global.__yandexDownloadUrlInflight ?? new Map<string, Promise<string>>();

global.__yandexDownloadUrlCache = downloadUrlCache;
global.__yandexDownloadUrlInflight = downloadUrlInflight;

function toPlainPath(path: string): string {
  const stripped = path.replace(/^(disk:|app:|trash:)/, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

function cleanupCache(now: number) {
  for (const [key, entry] of downloadUrlCache.entries()) {
    if (entry.expiresAt <= now) {
      downloadUrlCache.delete(key);
    }
  }

  if (downloadUrlCache.size <= MAX_CACHE_SIZE) {
    return;
  }

  const entries = Array.from(downloadUrlCache.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  const removeCount = downloadUrlCache.size - MAX_CACHE_SIZE;

  for (let i = 0; i < removeCount; i += 1) {
    downloadUrlCache.delete(entries[i][0]);
  }
}

function setCachedDownloadUrl(cacheKey: string, url: string) {
  const now = Date.now();
  cleanupCache(now);
  downloadUrlCache.set(cacheKey, {
    url,
    expiresAt: now + DOWNLOAD_URL_TTL_MS,
  });
}

function getCachedDownloadUrl(cacheKey: string): string | null {
  const cached = downloadUrlCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    downloadUrlCache.delete(cacheKey);
    return null;
  }

  return cached.url;
}

async function fetchJsonOrThrow(url: string, token: string, context: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { Authorization: `OAuth ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    let errText = '';
    try {
      errText = await response.text();
    } catch {
      // ignore secondary parse errors
    }
    console.error(`[image-proxy] ${context} error ${response.status}: ${errText}`);
    throw new Error(`${context} error ${response.status}: ${errText}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

async function loadPublicDownloadUrl(token: string, publicFolderKey: string, filePath: string): Promise<string> {
  const url =
    `${YANDEX_API_BASE}/public/resources/download` +
    `?public_key=${encodeURIComponent(publicFolderKey)}&path=${encodeURIComponent(filePath)}`;

  const payload = await fetchJsonOrThrow(url, token, 'Yandex public download');
  const href = typeof payload.href === 'string' ? payload.href : null;
  if (!href) {
    throw new Error('No download URL from Yandex');
  }

  return href;
}

async function loadPrivateDownloadUrl(token: string, diskPath: string): Promise<string> {
  const url = `${YANDEX_API_BASE}/resources?path=${encodeURIComponent(diskPath)}&fields=file`;
  const payload = await fetchJsonOrThrow(url, token, 'Yandex resource');
  const fileUrl = typeof payload.file === 'string' ? payload.file : null;
  if (!fileUrl) {
    throw new Error('No download URL from Yandex');
  }

  return fileUrl;
}

async function getOrLoadDownloadUrl(cacheKey: string, loader: () => Promise<string>): Promise<string> {
  const cached = getCachedDownloadUrl(cacheKey);
  if (cached) {
    return cached;
  }

  const inflight = downloadUrlInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const promise = loader()
    .then((url) => {
      setCachedDownloadUrl(cacheKey, url);
      return url;
    })
    .finally(() => {
      downloadUrlInflight.delete(cacheKey);
    });

  downloadUrlInflight.set(cacheKey, promise);
  return promise;
}

async function streamFromUrl(url: string): Promise<NextResponse> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok || !response.body) {
    return new NextResponse('Failed to fetch image from Yandex storage', { status: 502 });
  }

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return new NextResponse('Missing key', { status: 400 });
  }

  const token = process.env.YANDEX_DISK_TOKEN?.trim();
  if (!token) {
    return new NextResponse('Storage not configured', { status: 500 });
  }

  let cacheKey: string;
  let loader: () => Promise<string>;

  if (key.startsWith('ypub::')) {
    const rest = key.slice('ypub::'.length);
    const separatorIndex = rest.indexOf('::');
    if (separatorIndex === -1) {
      return new NextResponse('Invalid key format', { status: 400 });
    }

    const publicFolderKey = rest.slice(0, separatorIndex);
    const filePath = rest.slice(separatorIndex + 2);

    cacheKey = `pub:${publicFolderKey}::${filePath}`;
    loader = () => loadPublicDownloadUrl(token, publicFolderKey, filePath);
  } else {
    const diskPath = toPlainPath(key);
    cacheKey = `priv:${diskPath}`;
    loader = () => loadPrivateDownloadUrl(token, diskPath);
  }

  try {
    const cachedUrl = await getOrLoadDownloadUrl(cacheKey, loader);
    const firstAttempt = await streamFromUrl(cachedUrl);
    if (firstAttempt.status < 500) {
      return firstAttempt;
    }

    // Temporary links can expire. Force-refresh once.
    downloadUrlCache.delete(cacheKey);
    const refreshedUrl = await getOrLoadDownloadUrl(cacheKey, loader);
    return streamFromUrl(refreshedUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown image proxy error';
    return new NextResponse(message, { status: 502 });
  }
}
