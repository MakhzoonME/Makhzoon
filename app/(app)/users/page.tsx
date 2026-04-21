'use client';
import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { OrgUser } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { Plus } from 'lucide-react';
import { InviteUserModal } from '@/components/users/InviteUserModal';

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const [showInvite, setShowInvite] = useState(false);

  const roleBadge = (role: string) => {
    const cls = role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>{role}</span>;
  };

  const columns: ColumnDef<OrgUser>[] = [
    { key: 'displayName', header: 'Name', render: (u) => <span className="font-medium text-gray-900">{u.displayName}</span> },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'role', header: 'Role', render: (u) => roleBadge(u.role) },
    { key: 'createdAt', header: 'Created', render: (u) => formatDate(u.createdAt) },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        actions={<Button size="sm" onClick={() => setShowInvite(true)}><Plus className="h-4 w-4 mr-1" />Invite User</Button>}
      />
      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable data={users} columns={columns} isLoading={isLoading} emptyMessage="No users found." keyExtractor={(u) => u.id} />
      </div>
      <InviteUserModal open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}
