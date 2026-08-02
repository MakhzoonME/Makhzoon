import { DatabaseSidebar } from '@/components/super-admin/DatabaseSidebar';

export default function DatabaseAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <DatabaseSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
