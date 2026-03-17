'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Users, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/settings';
import { StatsCards } from '@/components/admin/stats-cards';

export default function AdminDashboardPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [classroomCount, setClassroomCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, libraryRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/library'),
        ]);

        if (usersRes.ok) {
          const users = await usersRes.json();
          setUserCount(Array.isArray(users?.users) ? users.users.length : null);
        }

        if (libraryRes.ok) {
          const library = await libraryRes.json();
          setClassroomCount(Array.isArray(library?.classrooms) ? library.classrooms.length : null);
        }
      } catch {
        // Stats remain null on error
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your OpenMAIC platform.</p>
      </div>

      {/* Stats */}
      <StatsCards userCount={userCount} classroomCount={classroomCount} loading={loading} />

      {/* Actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Platform Settings
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/users">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/library">
              <Library className="h-4 w-4 mr-2" />
              Content Library
            </Link>
          </Button>
        </div>
      </div>

      {/* Settings dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
