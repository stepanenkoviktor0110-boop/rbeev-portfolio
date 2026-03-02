'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function PublicContextMenuGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdminArea = pathname?.startsWith('/admin') || pathname?.startsWith('/login');
    if (isAdminArea) return;

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [pathname]);

  return null;
}
