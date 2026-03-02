'use client';

import { useEffect, useState } from 'react';
import {
  COOKIE_CONSENT_EVENT,
  type CookieConsent,
  getCookieConsent,
  saveCookieConsent,
} from '@/lib/cookieConsent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      setVisible(true);
      return;
    }
    setPreferences(existing.preferences);
    setAnalytics(existing.analytics);

    const onConsentUpdated = (event: Event) => {
      const custom = event as CustomEvent<CookieConsent>;
      if (!custom.detail) return;
      setPreferences(!!custom.detail.preferences);
      setAnalytics(!!custom.detail.analytics);
      setVisible(false);
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentUpdated as EventListener);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentUpdated as EventListener);
  }, []);

  const save = (next: { preferences: boolean; analytics: boolean }) => {
    saveCookieConsent(next);
    setPreferences(next.preferences);
    setAnalytics(next.analytics);
    setVisible(false);
    setShowCustomize(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto max-w-4xl rounded-none border border-white/15 bg-black/85 p-4 shadow-2xl backdrop-blur">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-accent">РњС‹ РёСЃРїРѕР»СЊР·СѓРµРј cookies</p>
            <p className="text-sm text-white/80">
              РЎР°Р№С‚ РёСЃРїРѕР»СЊР·СѓРµС‚ РЅРµРѕР±С…РѕРґРёРјС‹Рµ cookies РґР»СЏ СЂР°Р±РѕС‚С‹ Рё РјРѕР¶РµС‚ СЃРѕС…СЂР°РЅСЏС‚СЊ cookies РїСЂРµРґРїРѕС‡С‚РµРЅРёР№
              (РЅР°РїСЂРёРјРµСЂ, РЅР°СЃС‚СЂРѕР№РєРё РїСЂРѕСЃРјРѕС‚СЂР° РіР°Р»РµСЂРµРё). Р’С‹ РјРѕР¶РµС‚Рµ РїСЂРёРЅСЏС‚СЊ РІСЃРµ cookies, РѕСЃС‚Р°РІРёС‚СЊ С‚РѕР»СЊРєРѕ
              РЅРµРѕР±С…РѕРґРёРјС‹Рµ РёР»Рё РЅР°СЃС‚СЂРѕРёС‚СЊ РєР°С‚РµРіРѕСЂРёРё.
            </p>

            {showCustomize && (
              <div className="mt-3 rounded-none border border-white/10 bg-white/5 p-3">
                <div className="space-y-3 text-sm">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" checked disabled className="mt-0.5" />
                    <span>
                      <span className="block font-medium text-white">РќРµРѕР±С…РѕРґРёРјС‹Рµ cookies</span>
                      <span className="text-white/60">РќСѓР¶РЅС‹ РґР»СЏ Р±Р°Р·РѕРІРѕР№ СЂР°Р±РѕС‚С‹ СЃР°Р№С‚Р° Рё Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={preferences}
                      onChange={(e) => setPreferences(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-medium text-white">РџСЂРµРґРїРѕС‡С‚РµРЅРёСЏ</span>
                      <span className="text-white/60">
                        РЎРѕС…СЂР°РЅРµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёС… РЅР°СЃС‚СЂРѕРµРє (РЅР°РїСЂРёРјРµСЂ, С„РёР»СЊС‚СЂ/СЃС‚СЂР°РЅРёС†Р° РіР°Р»РµСЂРµРё).
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-medium text-white">РђРЅР°Р»РёС‚РёРєР°</span>
                      <span className="text-white/60">
                        РЎР±РѕСЂ СЃС‚Р°С‚РёСЃС‚РёРєРё РїРѕСЃРµС‰РµРЅРёР№. РЎРµР№С‡Р°СЃ РёРЅС‚РµРіСЂР°С†РёРё Р°РЅР°Р»РёС‚РёРєРё РЅРµ РїРѕРґРєР»СЋС‡РµРЅС‹.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => save({ preferences, analytics })}
                    className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-black"
                  >
                    РЎРѕС…СЂР°РЅРёС‚СЊ РІС‹Р±РѕСЂ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomize(false)}
                    className="rounded-none bg-white/10 px-4 py-2 text-sm"
                  >
                    РќР°Р·Р°Рґ
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {!showCustomize && (
              <>
                <button
                  type="button"
                  onClick={() => save({ preferences: true, analytics: true })}
                  className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-black"
                >
                  РџСЂРёРЅСЏС‚СЊ РІСЃРµ
                </button>
                <button
                  type="button"
                  onClick={() => save({ preferences: false, analytics: false })}
                  className="rounded-none bg-white/10 px-4 py-2 text-sm"
                >
                  РўРѕР»СЊРєРѕ РЅРµРѕР±С…РѕРґРёРјС‹Рµ
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomize(true)}
                  className="rounded-none border border-white/20 px-4 py-2 text-sm"
                >
                  РќР°СЃС‚СЂРѕРёС‚СЊ
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
