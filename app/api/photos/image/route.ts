import { NextRequest, NextResponse } from 'next/server';

const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) return new NextResponse('Missing key', { status: 400 });

  const token = process.env.YANDEX_DISK_TOKEN?.trim();
  if (!token) return new NextResponse('Storage not configured', { status: 500 });

  const url = `${YANDEX_API_BASE}/resources?path=${encodeURIComponent(key)}&fields=file`;
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${token}` },
    // Don't cache in Next.js layer — we control caching via Cache-Control on the response
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[image-proxy] Yandex API error ${res.status} for key=${key}`);
    return new NextResponse('Image not found', { status: 404 });
  }

  const body = (await res.json()) as { file?: string };
  if (!body.file) {
    console.error(`[image-proxy] No file URL returned for key=${key}`);
    return new NextResponse('Image not available', { status: 404 });
  }

  // Yandex signed URLs are valid for ~30 min; cache for 20 min
  return NextResponse.redirect(body.file, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=1200, stale-while-revalidate=60',
    },
  });
}
