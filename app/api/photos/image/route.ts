import { NextRequest, NextResponse } from 'next/server';

const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';

/** Strip disk:/app:/trash: prefix — Yandex API also accepts plain /path */
function toPlainPath(path: string): string {
  const stripped = path.replace(/^(disk:|app:|trash:)/, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

async function streamFromUrl(url: string): Promise<NextResponse> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok || !res.body) {
    return new NextResponse('Failed to fetch image from Yandex storage', { status: 502 });
  }
  return new NextResponse(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) return new NextResponse('Missing key', { status: 400 });

  const token = process.env.YANDEX_DISK_TOKEN?.trim();
  if (!token) return new NextResponse('Storage not configured', { status: 500 });

  // ── Public folder file (imported without copying) ──────────────────────────
  // Format: ypub::{publicFolderUrl}::{filePathInFolder}
  if (key.startsWith('ypub::')) {
    const rest = key.slice('ypub::'.length);
    const sepIdx = rest.indexOf('::');
    if (sepIdx === -1) return new NextResponse('Invalid key format', { status: 400 });

    const publicFolderKey = rest.slice(0, sepIdx);
    const filePath = rest.slice(sepIdx + 2);

    const dlUrl =
      `${YANDEX_API_BASE}/public/resources/download` +
      `?public_key=${encodeURIComponent(publicFolderKey)}&path=${encodeURIComponent(filePath)}`;

    const dlRes = await fetch(dlUrl, {
      headers: { Authorization: `OAuth ${token}` },
      cache: 'no-store',
    });
    if (!dlRes.ok) {
      let errText = '';
      try { errText = await dlRes.text(); } catch { /* ignore */ }
      console.error(`[image-proxy] public dl error ${dlRes.status}: ${errText}`);
      return new NextResponse(`Yandex error ${dlRes.status}: ${errText}`, { status: 502 });
    }

    const dl = (await dlRes.json()) as { href?: string };
    if (!dl.href) return new NextResponse('No download URL from Yandex', { status: 404 });

    return streamFromUrl(dl.href);
  }

  // ── Private disk file (uploaded via admin) ─────────────────────────────────
  const diskPath = toPlainPath(key);
  const metaUrl = `${YANDEX_API_BASE}/resources?path=${encodeURIComponent(diskPath)}&fields=file`;

  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `OAuth ${token}` },
    cache: 'no-store',
  });

  if (!metaRes.ok) {
    let errText = '';
    try { errText = await metaRes.text(); } catch { /* ignore */ }
    console.error(`[image-proxy] Yandex ${metaRes.status} for key=${key} (diskPath=${diskPath}): ${errText}`);
    return new NextResponse(`Yandex error ${metaRes.status}: ${errText}`, { status: 502 });
  }

  const meta = (await metaRes.json()) as { file?: string };
  if (!meta.file) {
    console.error(`[image-proxy] No file URL for key=${key}`);
    return new NextResponse('No download URL from Yandex', { status: 404 });
  }

  return streamFromUrl(meta.file);
}
