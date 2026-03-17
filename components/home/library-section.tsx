'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface LibraryClassroom {
  id: string;
  title: string;
  created_at: string;
}

function formatDate(dateStr: string): string {
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

export function LibrarySection() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<LibraryClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLibrary() {
      try {
        const res = await fetch('/api/library');
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed with status ${res.status}`);
        }
        const data = (await res.json()) as { classrooms: LibraryClassroom[] };
        if (!cancelled) setClassrooms(data.classrooms ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchLibrary();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="w-full mt-12">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-border/40" />
        <span className="shrink-0 flex items-center gap-2 text-[13px] text-muted-foreground/60 select-none">
          <BookOpen className="size-3.5" />
          Library
        </span>
        <div className="flex-1 h-px bg-border/40" />
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
              <CardFooter>
                <div className="h-8 bg-muted rounded w-16" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
      )}

      {!loading && !error && classrooms.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No classrooms in library yet
        </p>
      )}

      {!loading && !error && classrooms.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {classrooms.map((classroom) => (
            <Card
              key={classroom.id}
              className="flex flex-col hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/classroom/${classroom.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px] font-medium leading-snug line-clamp-2">
                  {classroom.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <p className="text-[12px] text-muted-foreground">
                  {formatDate(classroom.created_at)}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/classroom/${classroom.id}`);
                  }}
                >
                  Open
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
