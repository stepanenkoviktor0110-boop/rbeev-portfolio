export default function Navigation() {
  return (
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-base/80 backdrop-blur">
      <div className="mx-auto flex max-w-[82.8rem] items-center justify-between px-4 py-4">
        <a href="#" className="font-serif text-xl text-accent">
          Ваш фотограф — Рамазан Беев
        </a>
        <div className="flex gap-4 text-sm text-white/80">
          <a href="#gallery">Галерея</a>
          <a href="#about">Обо мне</a>
          <a href="#how-it-works">Как всё устроено</a>
          <a href="#contacts">Контакты</a>
        </div>
      </div>
    </nav>
  );
}
