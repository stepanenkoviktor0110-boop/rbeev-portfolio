export default function About({ text }: { text: string }) {
  return (
    <section id="about" className="fade-edges mx-auto max-w-6xl px-4 py-16">
      <div className="card p-8">
        <h2 className="section-title mb-4">Обо мне</h2>
        <p className="text-white/80">{text || 'Фотограф с многолетним опытом в свадебных, портретных и репортажных съёмках.'}</p>
      </div>
    </section>
  );
}
