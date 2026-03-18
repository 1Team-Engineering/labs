import { LibraryTable } from '@/components/admin/library-table';

export default function AdminLibraryPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage classroom visibility and publishing status.
        </p>
      </div>
      <LibraryTable />
    </div>
  );
}
