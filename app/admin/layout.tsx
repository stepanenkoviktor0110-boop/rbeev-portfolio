import AdminSidebar from '@/components/AdminSidebar';
import { isAuthorized } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthorized())) redirect('/login');
  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

