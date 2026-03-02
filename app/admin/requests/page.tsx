'use client';

import { useEffect, useMemo, useState } from 'react';

type Req = {
  id: number;
  name: string;
  contact: string;
  message: string;
  shootingDate: string;
  personalDataConsentAt: string | null;
  isRead: boolean;
  createdAt: string;
};

type ReqDraft = Pick<Req, 'name' | 'contact' | 'message' | 'shootingDate' | 'isRead'>;

type PaginatedRequestsResponse = {
  items: Req[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type BusyDate = {
  isoDate: string;
  requestId: number;
  request?: {
    name: string;
    contact: string;
    shootingDate: string;
  };
};

type DayItem = {
  iso: string;
  dayNumber: string;
  weekdayLabel: string;
  requestId: number | null;
  busy: boolean;
};

const PAGE_SIZE = 20;
const CALENDAR_DAYS = 10;

function normalizeRequestDate(value: string): string | null {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildCalendarDays(busyDatesMap: Record<string, number>): DayItem[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  return Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const date = new Date(base);
    date.setDate(base.getDate() + i + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    const requestId = busyDatesMap[iso] ?? null;
    return {
      iso,
      dayNumber: String(date.getDate()),
      weekdayLabel: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''),
      requestId,
      busy: requestId !== null,
    };
  });
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ReqDraft | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyDates, setBusyDates] = useState<BusyDate[]>([]);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [newRequestDate, setNewRequestDate] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [creatingManual, setCreatingManual] = useState(false);

  const busyDateMap = useMemo(
    () =>
      busyDates.reduce<Record<string, number>>((acc, item) => {
        acc[item.isoDate] = item.requestId;
        return acc;
      }, {}),
    [busyDates]
  );

  const loadBusyDates = async () => {
    const res = await fetch('/api/busy-dates', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as BusyDate[];
    setBusyDates(data);
  };

  const upsertBusyDate = (entry: BusyDate) => {
    setBusyDates((prev) => {
      const next = prev.filter((item) => item.isoDate !== entry.isoDate);
      next.push(entry);
      next.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
      return next;
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [showUnreadOnly]);

  useEffect(() => {
    loadBusyDates();
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (showUnreadOnly) params.set('unread', '1');

        const r = await fetch(`/api/requests?${params.toString()}`, { cache: 'no-store' });
        if (!r.ok || ignore) return;

        const data = (await r.json()) as Req[] | PaginatedRequestsResponse;
        if (Array.isArray(data)) {
          if (ignore) return;
          setRequests(data);
          setTotal(data.length);
          setTotalPages(1);
          return;
        }

        if (ignore) return;
        setRequests(data.items);
        setTotal(data.total);
        setTotalPages(Math.max(1, data.totalPages || Math.ceil(data.total / PAGE_SIZE)));
        if (data.page !== page) setPage(data.page);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [page, debouncedQuery, showUnreadOnly]);

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const startEdit = (req: Req) => {
    setEditingId(req.id);
    setDraft({
      name: req.name,
      contact: req.contact,
      message: req.message,
      shootingDate: req.shootingDate || '',
      isRead: !!req.isRead,
    });
  };

  const patchRequest = async (id: number, data?: Partial<ReqDraft>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: data ? { 'Content-Type': 'application/json' } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!res.ok) {
        alert('Ошибка: ' + (await res.text()));
        return;
      }
      const updated = await res.json();

      if (showUnreadOnly && updated.isRead) {
        const nextTotal = Math.max(0, total - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
        setTotal(nextTotal);
        setTotalPages(nextTotalPages);
        setRequests((prev) => prev.filter((r) => r.id !== id));
        if (editingId === id) cancelEdit();
        if (requests.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        return;
      }

      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (editingId === id) cancelEdit();
    } finally {
      setBusyId(null);
    }
  };

  const removeRequest = async (id: number) => {
    if (!confirm('Удалить заявку?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert('Ошибка удаления: ' + (await res.text()));
        return;
      }

      const nextTotal = Math.max(0, total - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) cancelEdit();

      if (requests.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }

      setBusyDates((prev) => prev.filter((item) => item.requestId !== id));
    } finally {
      setBusyId(null);
    }
  };

  const assignBusyDate = async (iso: string, requestId: number) => {
    setSavingDate(iso);
    try {
      const res = await fetch('/api/busy-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isoDate: iso, requestId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        alert(payload?.error || 'Не удалось подтвердить дату.');
        return false;
      }
      const created = (await res.json()) as BusyDate;
      upsertBusyDate(created);
      return true;
    } finally {
      setSavingDate(null);
    }
  };

  const unassignBusyDate = async (iso: string) => {
    if (!confirm('Снять отметку "занято" для этой даты?')) return;
    setSavingDate(iso);
    try {
      const res = await fetch(`/api/busy-dates/${iso}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        alert(payload?.error || 'Не удалось снять занятость.');
        return;
      }
      setBusyDates((prev) => prev.filter((item) => item.isoDate !== iso));
    } finally {
      setSavingDate(null);
    }
  };

  const handleCalendarClick = async (day: DayItem) => {
    if (day.busy) {
      await unassignBusyDate(day.iso);
      return;
    }
    setNewRequestDate(day.iso);
  };

  const confirmDateFromRequest = async (requestId: number, requestDate: string) => {
    const iso = normalizeRequestDate(requestDate);
    if (!iso) {
      alert('У заявки невалидная дата.');
      return;
    }
    await assignBusyDate(iso, requestId);
  };

  const createManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestDate) return;

    setCreatingManual(true);
    try {
      const createResponse = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualName.trim(),
          contact: manualContact.trim(),
          message: manualMessage.trim(),
          shootingDate: newRequestDate,
          personalDataConsent: true,
          personalDataConsentCheckedAt: new Date().toISOString(),
          website: '',
        }),
      });

      if (!createResponse.ok) {
        const payload = await createResponse.json().catch(() => ({}));
        alert(payload?.error || 'Не удалось создать заявку.');
        return;
      }

      const created = (await createResponse.json()) as Req;
      const assigned = await assignBusyDate(newRequestDate, created.id);
      if (!assigned) return;

      setRequests((prev) => [created, ...prev].slice(0, PAGE_SIZE));
      const nextTotal = total + 1;
      setTotal(nextTotal);
      setTotalPages(Math.max(1, Math.ceil(nextTotal / PAGE_SIZE)));

      setManualName('');
      setManualContact('');
      setManualMessage('');
      setNewRequestDate(null);
    } finally {
      setCreatingManual(false);
    }
  };

  const calendarDays = buildCalendarDays(busyDateMap);
  const isSavingRequestDate = (value: string) => {
    const iso = normalizeRequestDate(value);
    return iso !== null && savingDate === iso;
  };

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl text-accent">Заявки</h1>

      <section className="card space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-accent">Календарь занятых дат</h2>
          <p className="text-xs text-white/55">Занять дату можно только через заявку</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5 lg:grid-cols-10">
          {calendarDays.map((day) => (
            <button
              key={day.iso}
              type="button"
              onClick={() => handleCalendarClick(day)}
              disabled={savingDate === day.iso}
              title={day.requestId ? `Заявка #${day.requestId}` : 'Свободно'}
              className={[
                'rounded-none border px-2 py-3 text-center transition',
                day.busy
                  ? 'border-[#b8963e]/70 bg-[#b8963e]/15 text-accent'
                  : 'border-white/15 bg-white/[0.02] text-white/75 hover:border-[#b8963e]/50',
              ].join(' ')}
            >
              <div className="text-[10px] uppercase text-white/45">{day.weekdayLabel}</div>
              <div className="text-2xl leading-none">{day.dayNumber}</div>
              <div className="mt-1 text-[10px]">{day.busy ? 'Занято' : 'Свободно'}</div>
            </button>
          ))}
        </div>

        {newRequestDate && (
          <form onSubmit={createManualRequest} className="mt-3 grid gap-3 border border-white/15 p-3">
            <p className="text-sm text-white/85">
              Создать заявку на дату <span className="text-accent">{newRequestDate}</span> и отметить её как занятую.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Имя"
                className="rounded-none bg-white/10 px-3 py-2"
                required
              />
              <input
                value={manualContact}
                onChange={(e) => setManualContact(e.target.value)}
                placeholder="Контакт"
                className="rounded-none bg-white/10 px-3 py-2"
                required
              />
            </div>
            <textarea
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              placeholder="Комментарий к заявке"
              className="min-h-24 rounded-none bg-white/10 px-3 py-2"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creatingManual}
                className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Создать заявку и занять дату
              </button>
              <button
                type="button"
                onClick={() => setNewRequestDate(null)}
                className="rounded-none bg-white/10 px-4 py-2 text-sm"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="card grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени, контакту, сообщению..."
          className="rounded-none bg-white/10 px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
          />
          Только непрочитанные
        </label>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
        <p className="text-white/70">
          Найдено: <span className="text-white">{total}</span>
          {loading && <span className="ml-2 text-white/50">Загрузка...</span>}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="ui-button"
          >
            ← Назад
          </button>
          <p className="min-w-24 text-center text-white/70">
            {page} / {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="ui-button"
          >
            Вперёд →
          </button>
        </div>
      </div>

      {requests.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {r.name} — {r.contact}
              </p>
              <p className="text-xs text-white/50">
                Создано: {new Date(r.createdAt).toLocaleString('ru-RU')}
              </p>
              <p className="text-xs text-white/50">
                Согласие на ПДн:{' '}
                {r.personalDataConsentAt
                  ? new Date(r.personalDataConsentAt).toLocaleString('ru-RU')
                  : 'нет отметки'}
              </p>
              {r.shootingDate && (
                <p className="text-sm text-accent">
                  Дата фотосессии:{' '}
                  {new Date(r.shootingDate).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
              {r.shootingDate && (
                <button
                  type="button"
                  onClick={() => confirmDateFromRequest(r.id, r.shootingDate)}
                  disabled={isSavingRequestDate(r.shootingDate)}
                  className="mt-2 rounded-none border border-[#b8963e]/60 px-3 py-1 text-xs text-[#b8963e] transition hover:bg-[#b8963e]/12 disabled:opacity-50"
                >
                  Подтвердить дату в календаре
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => patchRequest(r.id, { isRead: !r.isRead })}
                disabled={busyId === r.id}
                className={`rounded-none border px-3 py-1 text-xs ${
                  r.isRead ? 'border-white/15 text-white/60' : 'border-accent/40 text-accent'
                }`}
              >
                {r.isRead ? 'Прочитано' : 'Пометить прочитанным'}
              </button>
              <button
                type="button"
                onClick={() => (editingId === r.id ? cancelEdit() : startEdit(r))}
                disabled={busyId === r.id}
                className="rounded-none border border-white/15 px-3 py-1 text-xs"
              >
                {editingId === r.id ? 'Отмена' : 'Редактировать'}
              </button>
              <button
                type="button"
                onClick={() => removeRequest(r.id)}
                disabled={busyId === r.id}
                className="rounded-none border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-200"
              >
                Удалить
              </button>
            </div>
          </div>

          {editingId === r.id && draft ? (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                patchRequest(r.id, draft);
              }}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  className="rounded-none bg-white/10 px-3 py-2"
                  placeholder="Имя"
                />
                <input
                  value={draft.contact}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, contact: e.target.value } : prev))}
                  className="rounded-none bg-white/10 px-3 py-2"
                  placeholder="Контакт"
                />
              </div>

              <input
                type="date"
                value={draft.shootingDate ? String(draft.shootingDate).slice(0, 10) : ''}
                onChange={(e) => setDraft((prev) => (prev ? { ...prev, shootingDate: e.target.value } : prev))}
                className="rounded-none bg-white/10 px-3 py-2 md:max-w-xs"
              />
              <button
                type="button"
                onClick={() => confirmDateFromRequest(r.id, draft.shootingDate)}
                disabled={!draft.shootingDate || isSavingRequestDate(draft.shootingDate)}
                className="w-fit rounded-none border border-[#b8963e]/60 px-3 py-2 text-xs text-[#b8963e] transition hover:bg-[#b8963e]/12 disabled:opacity-50"
              >
                Подтвердить дату в календаре
              </button>

              <textarea
                value={draft.message}
                onChange={(e) => setDraft((prev) => (prev ? { ...prev, message: e.target.value } : prev))}
                className="min-h-28 rounded-none bg-white/10 px-3 py-2"
                placeholder="Сообщение"
              />

              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={draft.isRead}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, isRead: e.target.checked } : prev))}
                />
                Прочитано
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busyId === r.id}
                  className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-none bg-white/10 px-4 py-2 text-sm"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <p className="whitespace-pre-wrap text-white/80">{r.message}</p>
          )}
        </div>
      ))}

      {!loading && requests.length === 0 && (
        <div className="card p-4 text-white/60">Заявки не найдены</div>
      )}
    </div>
  );
}


