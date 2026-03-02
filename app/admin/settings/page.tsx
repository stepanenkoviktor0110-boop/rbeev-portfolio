'use client';

import { useEffect, useState } from 'react';

type SettingsForm = {
  id?: number;
  heroTitle?: string;
  heroSubtitle?: string;
  workflowTitle?: string;
  workflowItems?: string;
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
    label: 'Подзаголовок Hero',
    placeholder: 'Например: Портреты. Семьи. Живые моменты — Москва',
  },
  { key: 'email', label: 'Email', placeholder: 'example@mail.com' },
  { key: 'phone', label: 'Телефон', placeholder: '+7 ...' },
  { key: 'telegram', label: 'Telegram', placeholder: '@username или ссылка' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+7 ...' },
  { key: 'instagram', label: 'Instagram', placeholder: '@username или ссылка' },
];

const defaultWorkflowItems = [
  'Мы встречаемся там, где вам комфортно.',
  'Съёмка длится столько, сколько нужно моменту.',
  'Готовые фото — в течение недели.',
  'Стоимость — от 15 000 ₽, формат и детали обсуждаем под вашу историю.',
];

function parseWorkflowItems(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return defaultWorkflowItems;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultWorkflowItems;
    const clean = parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
    return clean.length > 0 ? clean : defaultWorkflowItems;
  } catch {
    return defaultWorkflowItems;
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsForm | null>(null);
  const [password, setPassword] = useState('');
  const [workflowItems, setWorkflowItems] = useState<string[]>(defaultWorkflowItems);

  useEffect(() => {
    const load = async () => {
      const settings = (await fetch('/api/settings').then((r) => r.json())) as SettingsForm;
      setData(settings);
      setWorkflowItems(parseWorkflowItems(settings.workflowItems));
    };
    load();
  }, []);

  if (!data) return null;

  const setField = (key: keyof SettingsForm, value: string) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setWorkflowItem = (index: number, value: string) => {
    setWorkflowItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addWorkflowItem = () => {
    setWorkflowItems((prev) => [...prev, '']);
  };

  const removeWorkflowItem = (index: number) => {
    setWorkflowItems((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...data,
      workflowItems: JSON.stringify(workflowItems.map((item) => item.trim()).filter(Boolean)),
    };

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

        <div className="space-y-3">
          <label className="block text-sm text-white/70">Блок «Как всё устроено» — заголовок</label>
          <input
            value={String(data.workflowTitle ?? '')}
            onChange={(e) => setField('workflowTitle', e.target.value)}
            placeholder="Как всё устроено"
            className="w-full rounded-none bg-white/10 px-3 py-2"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm text-white/70">Плашки блока (количество и текст)</label>
            <span className="text-xs text-white/50">Количество: {workflowItems.length}</span>
          </div>

          <div className="space-y-3">
            {workflowItems.map((item, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_auto]">
                <textarea
                  value={item}
                  onChange={(e) => setWorkflowItem(i, e.target.value)}
                  placeholder={`Плашка ${i + 1}`}
                  className="min-h-[90px] w-full rounded-none bg-white/10 px-3 py-2 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => removeWorkflowItem(i)}
                  className="rounded-none border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addWorkflowItem}
            className="rounded-none border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/10"
          >
            Добавить плашку
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="aboutText" className="block text-sm text-white/70">
            Текст блока «Обо мне»
          </label>
          <textarea
            id="aboutText"
            value={String(data.aboutText ?? '')}
            onChange={(e) => setField('aboutText', e.target.value)}
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="personalDataConsentText" className="block text-sm text-white/70">
            Текст согласия на ПДн
          </label>
          <textarea
            id="personalDataConsentText"
            value={String(data.personalDataConsentText ?? '')}
            onChange={(e) => setField('personalDataConsentText', e.target.value)}
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="personalDataPolicyText" className="block text-sm text-white/70">
            Текст политики обработки ПДн
          </label>
          <textarea
            id="personalDataPolicyText"
            value={String(data.personalDataPolicyText ?? '')}
            onChange={(e) => setField('personalDataPolicyText', e.target.value)}
            className="min-h-[220px] w-full rounded-none bg-white/10 px-3 py-3 leading-relaxed"
          />
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

