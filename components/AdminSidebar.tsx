'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const items = [
  ['Галерея', '/admin/gallery'],
  ['Категории', '/admin/categories'],
  ['Отзывы', '/admin/reviews'],
  ['Заявки', '/admin/requests'],
  ['Настройки', '/admin/settings'],
] as const;

export default function AdminSidebar() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    } catch {
      alert('Ошибка выхода из админки');
      setLoggingOut(false);
    }
  };

  return (
    <aside className="min-h-screen w-64 border-r border-white/10 bg-black/40 p-6">
      <h2 className="mb-6 font-serif text-2xl text-accent">Админка</h2>
      <nav className="space-y-3">
        {items.map(([label, href]) => (
          <a key={href} href={href} className="block rounded-none px-3 py-2 hover:bg-white/10">
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-8 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="w-full rounded-none border border-white/20 px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10 disabled:opacity-50"
        >
          {loggingOut ? 'Выход...' : 'Выйти'}
        </button>
      </div>
    </aside>
  );
}