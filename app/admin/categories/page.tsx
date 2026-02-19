'use client';

import { useEffect, useState } from 'react';

type Category = { id: number; name: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');

  const load = async () => setCategories(await fetch('/api/categories').then((r) => r.json()));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    setName('');
    load();
  };

  const remove = async (id: number) => { await fetch('/api/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); load(); };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-accent">Категории</h1>
      <form onSubmit={add} className="card flex gap-2 p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новая категория" className="flex-1 rounded bg-white/10 px-3 py-2" required />
        <button className="rounded bg-accent px-4 py-2 text-black">Добавить</button>
      </form>
      {categories.map((c) => (
        <div key={c.id} className="card flex items-center justify-between p-3">
          <span>{c.name}</span>
          <button onClick={() => remove(c.id)} className="text-sm text-red-300">Удалить</button>
        </div>
      ))}
    </div>
  );
}
