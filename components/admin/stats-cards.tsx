import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Library, Loader2 } from 'lucide-react';

interface StatsCardsProps {
  userCount: number | null;
  classroomCount: number | null;
  loading: boolean;
}

export function StatsCards({ userCount, classroomCount, loading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Users className="h-4 w-4" />
            Total Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-3xl font-bold">{userCount ?? '—'}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Library className="h-4 w-4" />
            Total Classrooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-3xl font-bold">{classroomCount ?? '—'}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
