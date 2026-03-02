type HowItWorksProps = {
  title?: string | null;
  itemsJson?: string | null;
};

const fixedItems = [
  'Приеду туда, где вам будет комфортно — парк, двор, любимое место.',
  'Не тороплю. Снимаем столько, сколько нужно.',
  'Фотографии пришлю в течение недели.',
];

export default function HowItWorks({ title, itemsJson }: HowItWorksProps) {
  void itemsJson;
  const resolvedItems = fixedItems;
  const resolvedTitle = title?.trim() || 'Как всё устроено';

  return (
    <section id="how-it-works" className="fade-edges mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
      <div className="card p-8">
        <h2 className="section-title mb-6">{resolvedTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resolvedItems.map((text, i) => (
            <article key={`${i}-${text.slice(0, 24)}`} className="p-4 text-base leading-relaxed text-white/80">
              <p className="mb-2 text-sm tracking-[0.18em] text-accent/85">{String(i + 1).padStart(2, '0')}</p>
              <div className="mb-3 h-px w-12 bg-accent/60" />
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 px-4 text-left text-[14px] text-white/45">
          Стоимость — от 15 000 ₽. Детали обсудим, когда напишете.
        </p>
      </div>
    </section>
  );
}
