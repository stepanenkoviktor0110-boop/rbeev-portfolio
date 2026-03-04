'use client';

import { useMemo } from 'react';

type AvailabilityRibbonProps = {
  busyDates?: string[];
};

type DayItem = {
  iso: string;
  dayNumber: string;
  weekdayLabel: string;
  date: Date;
  busy: boolean;
};

const DAYS_COUNT = 10;

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMonthYear(date: Date): string {
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date).toLowerCase();
  const year = String(date.getFullYear());
  return `${month} ${year}`;
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date).toLowerCase();
}

function buildMonthCaption(days: DayItem[]): string {
  if (days.length === 0) return '';

  const first = days[0].date;
  const last = days[days.length - 1].date;
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
  if (sameMonth) return formatMonthYear(first);

  const firstMonth = capitalizeFirst(formatMonth(first));
  const lastMonth = capitalizeFirst(formatMonth(last));
  const sameYear = first.getFullYear() === last.getFullYear();
  if (sameYear) return `${firstMonth}-${lastMonth}`;

  return `${firstMonth} ${first.getFullYear()}-${lastMonth} ${last.getFullYear()}`;
}

function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDays(busyDates: Set<string>): DayItem[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  return Array.from({ length: DAYS_COUNT }, (_, i) => {
    const date = new Date(base);
    date.setDate(base.getDate() + i + 1);
    const iso = toIsoDateLocal(date);
    const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
      .format(date)
      .replace('.', '')
      .toLowerCase();

    return {
      iso,
      dayNumber: String(date.getDate()),
      weekdayLabel: capitalizeFirst(weekday),
      date,
      busy: busyDates.has(iso),
    };
  });
}

function scrollToContactsAndApplyDate(isoDate: string) {
  const contacts = document.getElementById('contacts');
  contacts?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  window.dispatchEvent(new CustomEvent('shooting-date:selected', { detail: { isoDate } }));
}

export default function AvailabilityRibbon({ busyDates = [] }: AvailabilityRibbonProps) {
  const days = useMemo(() => buildDays(new Set(busyDates)), [busyDates]);
  const monthCaption = useMemo(() => buildMonthCaption(days), [days]);

  return (
    <section aria-label="Доступность дат" className="mx-auto w-full max-w-6xl px-4 py-14">
      <p className="mb-2 text-center font-serif text-4xl text-accent md:text-5xl">Мой календарь съёмок</p>
      {monthCaption && (
        <p className="mb-7 text-center font-serif text-xl uppercase tracking-[0.08em] text-white/45 md:text-2xl">
          {monthCaption}
        </p>
      )}

      <div className="availability-ribbon overflow-x-auto">
        <div className="flex min-w-[780px] snap-x snap-mandatory gap-1 md:grid md:min-w-0 md:grid-cols-10 md:gap-2">
          {days.map((day) => (
            <article
              key={day.iso}
              className={[
                'group relative flex h-28 w-[78px] flex-none snap-start flex-col items-center justify-center border border-transparent px-2 text-center transition-all duration-200 md:w-auto md:snap-none',
                day.busy
                  ? 'text-white/45 bg-white/[0.01] hover:bg-[#2a1712]'
                  : 'text-white/90 cursor-pointer hover:border-[#b8963e]/60 hover:bg-[rgb(var(--gold)/0.12)]',
              ].join(' ')}
              onClick={day.busy ? undefined : () => scrollToContactsAndApplyDate(day.iso)}
              role={day.busy ? undefined : 'button'}
              tabIndex={day.busy ? -1 : 0}
              onKeyDown={
                day.busy
                  ? undefined
                  : (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        scrollToContactsAndApplyDate(day.iso);
                      }
                    }
              }
            >
              {day.busy && (
                <span className="absolute right-2 top-2 text-white/45" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                    <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Zm3 3a2 2 0 0 1 1 3.73V19h-2v-2.27A2 2 0 0 1 12 13Z" />
                  </svg>
                </span>
              )}

              <span
                className={[
                  'font-sans text-[10px] uppercase tracking-[0.14em]',
                  day.busy ? 'text-accent/45' : 'text-accent/40',
                ].join(' ')}
              >
                {day.weekdayLabel}
              </span>

              <span className={['mt-1 font-serif text-4xl leading-none', day.busy ? 'text-white/50' : 'text-white'].join(' ')}>
                {day.dayNumber}
              </span>

              <span
                className={[
                  'pointer-events-none mt-2 min-h-[14px] font-sans text-[11px] leading-none transition-opacity duration-200',
                  day.busy ? 'text-[#b98b79] opacity-0 group-hover:opacity-100' : 'text-accent/75 opacity-0 group-hover:opacity-100',
                ].join(' ')}
              >
                {day.busy ? 'Дата занята' : 'Дата свободна'}
              </span>

              {!day.busy && (
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-none border border-accent/35 bg-black/85 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.08em] text-accent/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Нажмите, чтобы записаться
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
