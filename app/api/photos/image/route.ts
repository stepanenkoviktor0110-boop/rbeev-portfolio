import { NextRequest, NextResponse } from 'next/server';

const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';

/** Normalize to plain /path format — Yandex API accepts both disk:/path and /path */
function toPlainPath(path: string): string {
  // Strip disk:/app:/trash: schema prefix if present, ensure leading slash
  const stripped = path.replace(/^(disk:|app:|trash:)/, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) return new NextResponse('Missing key', { status: 400 });

  const token = process.env.YANDEX_DISK_TOKEN?.trim();
  if (!token) return new NextResponse('Storage not configured', { status: 500 });

  const diskPath = toPlainPath(key);
  const url = `${YANDEX_API_BASE}/resources?path=${encodeURIComponent(diskPath)}&fields=file`;

  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    let errText = '';
    try { errText = await res.text(); } catch { /* ignore */ }
    console.error(`[image-proxy] Yandex ${res.status} for key=${key} (diskPath=${diskPath}): ${errText}`);
    return new NextResponse(`Yandex error ${res.status}: ${errText}`, { status: 502 });
  }

  const body = (await res.json()) as { file?: string };
  if (!body.file) {
    console.error(`[image-proxy] No file URL for key=${key}`);
    return new NextResponse('No download URL from Yandex', { status: 404 });
  }

  // Yandex signed URLs are valid for ~30 min; cache for 20 min
  return NextResponse.redirect(body.file, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=1200, stale-while-revalidate=60',
    },
  });
}
