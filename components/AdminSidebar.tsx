const items = [
  ['Галерея', '/admin/gallery'],
  ['Категории', '/admin/categories'],
  ['Заявки', '/admin/requests'],
  ['Настройки', '/admin/settings'],
];

export default function AdminSidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-white/10 bg-black/40 p-6">
      <h2 className="mb-6 font-serif text-2xl text-accent">Админка</h2>
      <nav className="space-y-3">
        {items.map(([label, href]) => (
          <a key={href} href={href} className="block rounded px-3 py-2 hover:bg-white/10">
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
