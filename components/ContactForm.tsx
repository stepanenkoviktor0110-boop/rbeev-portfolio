'use client';

import { useRef, useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        name: formData.get('name') as string,
        contact: formData.get('contact') as string,
        message: formData.get('msg') as string,
        shootingDate: formData.get('shootingDate') as string,
      };
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus('ok');
        formRef.current?.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card grid gap-3 p-6">
      <input name="name" required placeholder="Ваше имя" className="rounded bg-white/10 px-3 py-2" />
      <input name="contact" required placeholder="Email или телефон" className="rounded bg-white/10 px-3 py-2" />
      <div>
        <label className="mb-1 block text-sm text-white/60">Желаемая дата фотосессии</label>
        <input
          type="date"
          name="shootingDate"
          className="w-full rounded bg-white/10 px-3 py-2 text-white [color-scheme:dark]"
        />
      </div>
      <textarea name="msg" required placeholder="Сообщение" className="min-h-32 rounded bg-white/10 px-3 py-2" />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded bg-accent px-4 py-2 font-medium text-black disabled:opacity-60"
      >
        {status === 'sending' ? 'Отправка...' : 'Отправить'}
      </button>
      {status === 'ok' && <p className="text-sm text-green-400">Спасибо! Заявка отправлена.</p>}
      {status === 'error' && <p className="text-sm text-red-400">Ошибка отправки. Попробуйте ещё раз.</p>}
    </form>
  );
}
