'use client';

import { useEffect, useState } from 'react';

type SettingsForm = {
  id?: number;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  personalDataConsentText?: string;
  personalDataPolicyText?: string;
  email?: string;
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  instagram?: string;
  [key: string]: unknown;
};

const topFields: Array<{ key: keyof SettingsForm; label: string; placeholder: string }> = [
  {
    key: 'heroTitle',
    label: 'Р“Р»Р°РІРЅС‹Р№ Р·Р°РіРѕР»РѕРІРѕРє',
    placeholder: 'РќР°РїСЂРёРјРµСЂ: РџСЂРѕС„РµСЃСЃРёРѕРЅР°Р»СЊРЅС‹Р№ С„РѕС‚РѕРіСЂР°С„',
  },
  {
    key: 'heroSubtitle',
    label: 'РћРїРёСЃР°РЅРёРµ РїРѕРґ Р·Р°РіРѕР»РѕРІРєРѕРј',
    placeholder: 'РљРѕСЂРѕС‚РєРёР№ С‚РµРєСЃС‚ РїРѕРґ РіР»Р°РІРЅС‹Рј Р·Р°РіРѕР»РѕРІРєРѕРј',
  },
  { key: 'email', label: 'Email', placeholder: 'example@mail.com' },
  { key: 'phone', label: 'РўРµР»РµС„РѕРЅ', placeholder: '+7 ...' },
  { key: 'telegram', label: 'Telegram', placeholder: '@username РёР»Рё СЃСЃС‹Р»РєР°' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+7 ...' },
  { key: 'instagram', label: 'Instagram', placeholder: '@username РёР»Рё СЃСЃС‹Р»РєР°' },
];

export default function SettingsPage() {
  const [data, setData] = useState<SettingsForm | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const load = async () => {
      const settings = await fetch('/api/settings').then((r) => r.json());
      setData(settings);
    };
    load();
  }, []);

  if (!data) return null;

  const setField = (key: keyof SettingsForm, value: string) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let message = 'РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ';
      try {
        const body = await res.json();
        message = body?.error || message;
      } catch {
        const text = await res.text();
        if (text) message = text;
      }
      alert(message);
      return;
    }

    alert('РЎРѕС…СЂР°РЅРµРЅРѕ');
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      alert('РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ РїР°СЂРѕР»СЏ');
      return;
    }

    setPassword('');
    alert('РџР°СЂРѕР»СЊ РѕР±РЅРѕРІР»С‘РЅ РІ С‚РµРєСѓС‰РµР№ СЃРµСЃСЃРёРё');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-accent">РќР°СЃС‚СЂРѕР№РєРё</h1>

      <form onSubmit={save} className="card space-y-8 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {topFields.map((field) => (
            <label key={String(field.key)} className="space-y-2">
              <span className="block text-sm text-white/70">{field.label}</span>
              <input
                value={String(data[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-none bg-white/10 px-3 py-2"
              />
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="aboutText" className="block text-sm text-white/70">
            РћРїРёСЃР°РЅРёРµ РІ Р±Р»РѕРєРµ В«РћР±Рѕ РјРЅРµВ»
          </label>
          <textarea
            id="aboutText"
            value={String(data.aboutText ?? '')}
            onChange={(e) => setField('aboutText', e.target.value)}
            placeholder="Р‘РѕР»СЊС€РѕР№ С‚РµРєСЃС‚ Рѕ РІР°СЃ, СЃС‚РёР»Рµ СЃСЉС‘РјРєРё, РїРѕРґС…РѕРґРµ Рє СЂР°Р±РѕС‚Рµ, РѕРїС‹С‚Рµ..."
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
          <p className="text-xs text-white/50">
            Р¤РѕС‚Рѕ РґР»СЏ РіР»Р°РІРЅРѕРіРѕ СЃР»Р°Р№РґС€РѕСѓ Рё Р±Р»РѕРєР° В«РћР±Рѕ РјРЅРµВ» СѓРїСЂР°РІР»СЏСЋС‚СЃСЏ С‡РµРєР±РѕРєСЃР°РјРё РІ СЂР°Р·РґРµР»Рµ В«Р“Р°Р»РµСЂРµСЏВ».
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="personalDataConsentText" className="block text-sm text-white/70">
            РўРµРєСЃС‚ СЃРѕРіР»Р°СЃРёСЏ РЅР° РѕР±СЂР°Р±РѕС‚РєСѓ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С…
          </label>
          <textarea
            id="personalDataConsentText"
            value={String(data.personalDataConsentText ?? '')}
            onChange={(e) => setField('personalDataConsentText', e.target.value)}
            placeholder="Р­С‚РѕС‚ С‚РµРєСЃС‚ РѕС‚РєСЂРѕРµС‚СЃСЏ РїРѕ СЃСЃС‹Р»РєРµ В«СЃРѕРіР»Р°СЃРёРµВ» РІ С„РѕСЂРјРµ Р·Р°СЏРІРєРё."
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
          <p className="text-xs text-white/50">
            Р•СЃР»Рё РїРѕР»Рµ РїСѓСЃС‚РѕРµ, РЅР° СЃР°Р№С‚Рµ Р±СѓРґРµС‚ РїРѕРєР°Р·Р°РЅ Р±Р°Р·РѕРІС‹Р№ С‚РµРєСЃС‚-Р·Р°РіР»СѓС€РєР°.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="personalDataPolicyText" className="block text-sm text-white/70">
            РўРµРєСЃС‚ РџРѕР»РёС‚РёРєРё РѕР±СЂР°Р±РѕС‚РєРё РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С…
          </label>
          <textarea
            id="personalDataPolicyText"
            value={String(data.personalDataPolicyText ?? '')}
            onChange={(e) => setField('personalDataPolicyText', e.target.value)}
            placeholder="Р­С‚РѕС‚ С‚РµРєСЃС‚ РѕС‚РєСЂРѕРµС‚СЃСЏ РїРѕ СЃСЃС‹Р»РєРµ В«РџРѕР»РёС‚РёРєРѕР№В» РІ С„РѕСЂРјРµ Р·Р°СЏРІРєРё."
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
          <p className="text-xs text-white/50">
            Р•СЃР»Рё РїРѕР»Рµ РїСѓСЃС‚РѕРµ, РЅР° СЃР°Р№С‚Рµ Р±СѓРґРµС‚ РїРѕРєР°Р·Р°РЅ Р±Р°Р·РѕРІС‹Р№ С‚РµРєСЃС‚-Р·Р°РіР»СѓС€РєР° РїРѕР»РёС‚РёРєРё.
          </p>
        </div>

        <button className="rounded-none bg-accent px-4 py-2 text-black">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
      </form>

      <form onSubmit={changePassword} className="card max-w-md space-y-3 p-6">
        <h2 className="font-serif text-2xl">РЎРјРµРЅР° РїР°СЂРѕР»СЏ (С‚РµРєСѓС‰Р°СЏ СЃРµСЃСЃРёСЏ)</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-none bg-white/10 px-3 py-2"
          placeholder="РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ"
        />
        <button className="rounded-none bg-accent px-4 py-2 text-black">РћР±РЅРѕРІРёС‚СЊ</button>
      </form>
    </div>
  );
}
