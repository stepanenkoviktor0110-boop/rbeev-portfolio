'use client';

import { useEffect, useRef, useState } from 'react';

type ContactFormProps = {
  personalDataConsentText?: string;
  personalDataPolicyText?: string;
};

const DEFAULT_CONSENT_TEXT =
  'Настоящим я даю согласие на обработку моих персональных данных, указанных в форме заявки, в целях обратной связи и согласования условий фотосъёмки.';

const DEFAULT_POLICY_TEXT =
  'Политика обработки персональных данных: данные, переданные через форму заявки, используются только для обратной связи, согласования услуг и исполнения запроса пользователя.';

type DialogKind = 'consent' | 'policy' | null;

export default function ContactForm({
  personalDataConsentText,
  personalDataPolicyText,
}: ContactFormProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [shootingDate, setShootingDate] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentCheckedAt, setConsentCheckedAt] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<DialogKind>(null);
  const [dateHighlighted, setDateHighlighted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const consentText = personalDataConsentText?.trim() || DEFAULT_CONSENT_TEXT;
  const policyText = personalDataPolicyText?.trim() || DEFAULT_POLICY_TEXT;
  const dialogTitle =
    activeDialog === 'consent'
      ? 'Согласие на обработку персональных данных'
      : 'Политика обработки персональных данных';
  const dialogText = activeDialog === 'consent' ? consentText : policyText;
  const validName = name.trim().length >= 2;
  const validContact = contact.trim().length >= 3;
  const validMessage = message.trim().length >= 5;

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onDateSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ isoDate?: string }>;
      const nextDate = customEvent.detail?.isoDate;
      if (!nextDate) return;

      setShootingDate(nextDate);

      setDateHighlighted(true);
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setDateHighlighted(false);
      }, 1000);
    };

    window.addEventListener('shooting-date:selected', onDateSelected);
    return () => window.removeEventListener('shooting-date:selected', onDateSelected);
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: name.trim(),
      contact: contact.trim(),
      message: message.trim(),
      shootingDate: shootingDate,
      personalDataConsent: consentChecked,
      personalDataConsentCheckedAt: consentCheckedAt,
      website: String(formData.get('website') || ''),
    };

    if (payload.name.length < 2) {
      setStatus('error');
      setErrorMessage('Имя должно содержать минимум 2 символа.');
      return;
    }
    if (payload.contact.length < 3) {
      setStatus('error');
      setErrorMessage('Контакт должен содержать минимум 3 символа.');
      return;
    }
    if (payload.message.length < 5) {
      setStatus('error');
      setErrorMessage('Сообщение должно содержать минимум 5 символов.');
      return;
    }
    if (!payload.personalDataConsent) {
      setStatus('error');
      setErrorMessage('Без согласия на обработку персональных данных отправка формы невозможна.');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus('ok');
        setErrorMessage('');
        setName('');
        setContact('');
        setMessage('');
        setShootingDate('');
        setConsentChecked(false);
        setConsentCheckedAt(null);
      } else {
        try {
          const data = await res.json();
          setErrorMessage(data?.error || 'Ошибка отправки. Попробуйте ещё раз.');
        } catch {
          setErrorMessage('Ошибка отправки. Попробуйте ещё раз.');
        }
        setStatus('error');
      }
    } catch {
      setErrorMessage('Ошибка отправки. Попробуйте ещё раз.');
      setStatus('error');
    }
  };

  return (
    <>
      {status === 'ok' ? (
        <div className="card grid gap-3 p-6 text-center">
          <h3 className="font-serif text-3xl text-accent">Спасибо</h3>
          <p className="text-white/85">Получил. Отвечу в течение дня — обычно раньше.</p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="mx-auto mt-2 inline-flex h-10 items-center justify-center rounded-none border border-[#b8963e]/60 px-5 text-sm text-[#b8963e] transition hover:bg-[#b8963e]/12"
          >
            Отправить ещё заявку
          </button>
        </div>
      ) : (
      <form ref={formRef} onSubmit={onSubmit} className="card grid gap-3 p-6">
        <div className="relative">
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="w-full rounded-none bg-white/10 px-3 py-2 pr-10"
          />
          {validName && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">✓</span>}
        </div>
        <div className="relative">
          <input
            name="contact"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email или телефон"
            className="w-full rounded-none bg-white/10 px-3 py-2 pr-10"
          />
          {validContact && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">✓</span>}
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/60">Желаемая дата фотосессии</label>
          <input
            id="shootingDate"
            type="date"
            name="shootingDate"
            value={shootingDate}
            onChange={(e) => setShootingDate(e.target.value)}
            className={[
              'w-full rounded-none border px-3 py-2 text-white [color-scheme:dark] transition-colors duration-200',
              dateHighlighted ? 'border-accent bg-white/15' : 'border-transparent bg-white/10',
            ].join(' ')}
          />
        </div>
        <textarea
          name="msg"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Расскажите — кто, по какому поводу, есть ли идеи по локации"
          className="min-h-32 rounded-none bg-white/10 px-3 py-2"
        />
        {validMessage && <p className="-mt-1 text-xs text-green-400">✓ Отлично, этого достаточно для старта</p>}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <label className="text-sm leading-relaxed text-white/75">
          <span className="inline-flex items-start gap-2">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => {
                const checked = e.target.checked;
                setConsentChecked(checked);
                setConsentCheckedAt(checked ? new Date().toISOString() : null);
              }}
              className="mt-1 h-4 w-4"
              required
            />
            <span>
              <span className="font-medium">Согласен на обработку данных.</span>{' '}
              <button
                type="button"
                onClick={() => setActiveDialog('consent')}
                className="inline text-white/60 underline underline-offset-2 transition hover:text-accent"
              >
                Подробнее
              </button>.
              {consentCheckedAt && (
                <span className="mt-1 block text-[11px] text-white/35">
                  Отмечено: {new Date(consentCheckedAt).toLocaleString('ru-RU')}
                </span>
              )}
            </span>
          </span>
        </label>
        <button
          type="submit"
          disabled={status === 'sending' || !consentChecked || !validName || !validContact || !validMessage}
          className="rounded-none bg-[#c9a84c] px-4 py-2 font-medium text-black shadow-[0_8px_18px_rgba(201,168,76,0.28)] transition hover:bg-[#d5b45a] disabled:opacity-60"
        >
          {status === 'sending' ? 'Отправка...' : 'Написать Рамазану'}
        </button>
        {status === 'error' && (
          <p className="text-sm text-red-400">{errorMessage || 'Ошибка отправки. Попробуйте ещё раз.'}</p>
        )}
      </form>
      )}

      {activeDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActiveDialog(null)}
        >
          <div
            className="card w-full max-w-2xl p-0"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="personal-data-dialog-title"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 id="personal-data-dialog-title" className="font-serif text-2xl text-accent">
                {dialogTitle}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="rounded-none bg-white/10 px-3 py-1 text-sm"
              >
                Закрыть
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">{dialogText}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
