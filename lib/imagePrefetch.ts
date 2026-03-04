type PrefetchOptions = {
  maxWidth?: number;
  minWidth?: number;
  quality?: number;
};

const ALLOWED_WIDTHS = [640, 750, 828, 1080, 1200, 1440, 1600, 1920];

function getOptimizedWidth(maxWidth: number, minWidth: number): number {
  if (typeof window === 'undefined') return maxWidth;
  const dpr = Math.min(Math.ceil(window.devicePixelRatio || 1), 2);
  const desired = Math.min(maxWidth, Math.max(minWidth, Math.ceil(window.innerWidth * dpr)));
  const allowed = ALLOWED_WIDTHS.find((width) => width >= desired);
  return allowed ?? ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

export function buildOptimizedImageUrl(imageUrl: string, options: PrefetchOptions = {}): string {
  const maxWidth = options.maxWidth ?? 1600;
  const minWidth = options.minWidth ?? 640;
  const quality = options.quality ?? 70;
  const width = getOptimizedWidth(maxWidth, minWidth);
  return `/_next/image?url=${encodeURIComponent(imageUrl)}&w=${width}&q=${quality}`;
}

export function prefetchOptimizedImage(imageUrl: string, options: PrefetchOptions = {}): void {
  if (typeof window === 'undefined') return;
  const img = new window.Image();
  img.decoding = 'async';
  img.src = buildOptimizedImageUrl(imageUrl, options);
}
