'use client';

import { useEffect, useState } from 'react';

type Req = { id: number; name: string; contact: string; message: string; shootingDate: string; isRead: boolean; createdAt: string };

export default function RequestsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const load = async () => { const r = await fetch('/api/requests'); if (r.ok) setRequests(await r.json()); };
  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await fetch(`/api/requests/${id}`, { method: 'PUT' });
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl text-accent">Заявки</h1>
      {requests.map((r) => (
        <div key={r.id} className="card p-4">
          <p className="font-medium">{r.name} — {r.contact}</p>
          {r.shootingDate && <p className="text-sm text-accent">Дата фотосессии: {new Date(r.shootingDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
          <p className="text-white/80">{r.message}</p>
          <button onClick={() => markRead(r.id)} disabled={r.isRead} className="mt-2 text-sm text-accent disabled:text-white/40">{r.isRead ? 'Прочитано' : 'Пометить прочитанным'}</button>
        </div>
      ))}
    </div>
  );
}
