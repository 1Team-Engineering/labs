import Link from 'next/link';
import { LayoutDashboard, Users, Library, ArrowLeft } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r bg-muted/30 flex flex-col">
        {/* Logo / Title */}
        <div className="h-16 px-4 flex items-center border-b">
          <span className="font-semibold text-sm tracking-wide">Admin Panel</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Users</span>
          </Link>
          <Link
            href="/admin/library"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <Library className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Library</span>
          </Link>
        </nav>

        {/* Back to home */}
        <div className="p-3 border-t">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Back to Home</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
