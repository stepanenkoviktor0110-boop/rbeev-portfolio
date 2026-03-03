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
    label: 'Главный заголовок',
    placeholder: 'Например: Профессиональный фотограф',
  },
  {
    key: 'heroSubtitle',
    label: 'Описание под заголовком',
    placeholder: 'Короткий текст под главным заголовком',
  },
  { key: 'email', label: 'Email', placeholder: 'example@mail.com' },
  { key: 'phone', label: 'Телефон', placeholder: '+7 ...' },
  { key: 'telegram', label: 'Telegram', placeholder: '@username или ссылка' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+7 ...' },
  { key: 'instagram', label: 'Instagram', placeholder: '@username или ссылка' },
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
      let message = 'Ошибка сохранения';
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

    alert('Сохранено');
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      alert('Ошибка обновления пароля');
      return;
    }

    setPassword('');
    alert('Пароль обновлён в текущей сессии');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-accent">Настройки</h1>

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
            Описание в блоке «Обо мне»
          </label>
          <textarea
            id="aboutText"
            value={String(data.aboutText ?? '')}
            onChange={(e) => setField('aboutText', e.target.value)}
            placeholder="Большой текст о вас, стиле съёмки, подходе к работе, опыте..."
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
          <p className="text-xs text-white/50">
            Фото для главного слайдшоу и блока «Обо мне» управляются чекбоксами в разделе «Галерея».
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="personalDataConsentText" className="block text-sm text-white/70">
            Текст согласия на обработку персональных данных
          </label>
          <textarea
            id="personalDataConsentText"
            value={String(data.personalDataConsentText ?? '')}
            onChange={(e) => setField('personalDataConsentText', e.target.value)}
            placeholder="Этот текст откроется по ссылке «согласие» в форме заявки."
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
          <p className="text-xs text-white/50">
            Если поле пустое, на сайте будет показан базовый текст-заглушка.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="personalDataPolicyText" className="block text-sm text-white/70">
            Текст Политики обработки персональных данных
          </label>
          <textarea
            id="personalDataPolicyText"
            value={String(data.personalDataPolicyText ?? '')}
            onChange={(e) => setField('personalDataPolicyText', e.target.value)}
            placeholder="Этот текст откроется по ссылке «Политикой» в форме заявки."
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
          <p className="text-xs text-white/50">
            Если поле пустое, на сайте будет показан базовый текст-заглушка политики.
          </p>
        </div>

        <button className="rounded-none bg-accent px-4 py-2 text-black">Сохранить</button>
      </form>

      <form onSubmit={changePassword} className="card max-w-md space-y-3 p-6">
        <h2 className="font-serif text-2xl">Смена пароля (текущая сессия)</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-none bg-white/10 px-3 py-2"
          placeholder="Новый пароль"
        />
        <button className="rounded-none bg-accent px-4 py-2 text-black">Обновить</button>
      </form>
    </div>
  );
}
