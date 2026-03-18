import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const admin = createAdminClient();
  const {
    data: { users },
    error,
  } = await admin.auth.admin.listUsers();
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
