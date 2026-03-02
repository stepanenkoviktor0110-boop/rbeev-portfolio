export const COOKIE_CONSENT_COOKIE = 'levelupme_cookie_consent';
export const SITE_PREFS_COOKIE = 'levelupme_site_prefs';
export const COOKIE_CONSENT_EVENT = 'levelupme:cookie-consent-updated';

export type CookieConsent = {
  version: 1;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  decidedAt: string;
};

type SitePrefs = {
  galleryCategoryId?: number | null;
  galleryPage?: number;
};

function isBrowser() {
  return typeof document !== 'undefined';
}

function getCookie(name: string) {
  if (!isBrowser()) return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!isBrowser()) return;
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function encodeJson(value: unknown) {
  return encodeURIComponent(JSON.stringify(value));
}

function decodeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return null;
  }
}

function emitConsentUpdated(consent: CookieConsent) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
}

export function getCookieConsent(): CookieConsent | null {
  const parsed = decodeJson<CookieConsent>(getCookie(COOKIE_CONSENT_COOKIE));
  if (!parsed || parsed.version !== 1) return null;
  return {
    version: 1,
    necessary: true,
    preferences: !!parsed.preferences,
    analytics: !!parsed.analytics,
    decidedAt: parsed.decidedAt || new Date().toISOString(),
  };
}

export function applyCookieConsent(consent: CookieConsent) {
  if (!consent.preferences) {
    deleteCookie(SITE_PREFS_COOKIE);
  }
  if (!consent.analytics) {
    deleteCookie('_ga');
    deleteCookie('_gid');
    deleteCookie('_gat');
  }
}

export function saveCookieConsent(input: Pick<CookieConsent, 'preferences' | 'analytics'>) {
  const consent: CookieConsent = {
    version: 1,
    necessary: true,
    preferences: !!input.preferences,
    analytics: !!input.analytics,
    decidedAt: new Date().toISOString(),
  };
  setCookie(COOKIE_CONSENT_COOKIE, encodeJson(consent), 60 * 60 * 24 * 180);
  applyCookieConsent(consent);
  emitConsentUpdated(consent);
  return consent;
}

export function canUseCookieCategory(category: 'necessary' | 'preferences' | 'analytics') {
  if (category === 'necessary') return true;
  const consent = getCookieConsent();
  if (!consent) return false;
  return category === 'preferences' ? consent.preferences : consent.analytics;
}

export function loadSitePrefs(): SitePrefs | null {
  if (!canUseCookieCategory('preferences')) return null;
  const parsed = decodeJson<SitePrefs>(getCookie(SITE_PREFS_COOKIE));
  if (!parsed) return null;
  return parsed;
}

export function saveSitePrefs(prefs: SitePrefs) {
  if (!canUseCookieCategory('preferences')) {
    deleteCookie(SITE_PREFS_COOKIE);
    return;
  }
  setCookie(SITE_PREFS_COOKIE, encodeJson(prefs), 60 * 60 * 24 * 90);
}
