'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface LibraryItem {
  id: string;
  title: string;
  created_by: string | null;
  created_at: string;
  published: boolean;
  published_by: string | null;
}

export function LibraryTable() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLibrary();
  }, []);

  async function fetchLibrary() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/library');
      if (!res.ok) throw new Error('Failed to load library');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublished(item: LibraryItem) {
    const newValue = !item.published;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, published: newValue } : i)),
    );
    setTogglingIds((prev) => new Set(prev).add(item.id));

    try {
      const res = await fetch(`/api/admin/library/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: newValue }),
      });

      if (!res.ok) {
        // Revert on failure
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, published: item.published } : i)),
        );
      }
    } catch {
      // Revert on network error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, published: item.published } : i)),
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-sm text-destructive">{error}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No classrooms found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {items.length} {items.length === 1 ? 'classroom' : 'classrooms'}
      </p>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Created By
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Created Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Published
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="px-4 py-3 font-medium">{item.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.created_by ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(item.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.published}
                      onCheckedChange={() => handleTogglePublished(item)}
                      disabled={togglingIds.has(item.id)}
                      aria-label={`${item.published ? 'Unpublish' : 'Publish'} ${item.title}`}
                    />
                    <Badge variant={item.published ? 'default' : 'outline'}>
                      {item.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
