import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (JSON.parse(atob(session.access_token.split('.')[1])) as { user_role?: string }).user_role;
  if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data: { users }, error } = await admin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profiles } = await admin.from('profiles').select('id, role, full_name');
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: invites } = await admin.from('invites').select('email, accepted_at');
  const inviteMap = new Map((invites ?? []).map((i) => [i.email, i]));

  const enriched = users.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: profileMap.get(u.id)?.full_name ?? '',
    role: profileMap.get(u.id)?.role ?? 'employee',
    status: inviteMap.get(u.email ?? '')?.accepted_at ? 'active' : 'pending',
    created_at: u.created_at,
  }));

  return NextResponse.json({ users: enriched });
}
