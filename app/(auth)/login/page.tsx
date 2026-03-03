'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/admin/gallery');
      return;
    }

    let message = `Ошибка входа (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore parse errors and keep fallback message
    }
    setError(message);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="font-serif text-3xl text-accent">Вход в админку</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-none bg-white/10 px-3 py-2" placeholder="Пароль" required />
        <button className="w-full rounded-none bg-accent px-4 py-2 font-medium text-black">Войти</button>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </form>
    </main>
  );
}
