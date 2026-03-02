import { NextResponse } from 'next/server';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = global.__rateLimitStore || new Map<string, RateLimitEntry>();

if (!global.__rateLimitStore) {
  global.__rateLimitStore = rateLimitStore;
}

function getExpectedOrigins(request: Request): string[] {
  const origins = new Set<string>();
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';

  if (host) {
    origins.add(`${proto}://${host}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      origins.add(new URL(siteUrl).origin);
    } catch {
      // Ignore invalid NEXT_PUBLIC_SITE_URL and fall back to request host.
    }
  }

  return [...origins];
}

export function requireSameOrigin(request: Request) {
  const allowedOrigins = getExpectedOrigins(request);
  if (allowedOrigins.length === 0) return null;

  const origin = request.headers.get('origin');
  if (origin) {
    if (allowedOrigins.includes(origin)) return null;
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refererOrigin)) return null;
    } catch {
      // Ignore parse failure and reject below.
    }
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Missing origin' }, { status: 403 });
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function cleanupRateLimitStore(now: number) {
  if (rateLimitStore.size < 500) return;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return {
    ok: true,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function rateLimitJsonResponse(message = 'Too many requests', retryAfterSec = 60) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}
