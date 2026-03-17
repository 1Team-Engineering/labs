import { UserTable } from '@/components/admin/user-table';

export default function AdminUsersPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage platform users and send invitations.
        </p>
      </div>
      <UserTable />
    </div>
  );
}
