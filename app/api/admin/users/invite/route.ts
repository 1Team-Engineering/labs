import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (JSON.parse(atob(session.access_token.split('.')[1])) as { user_role?: string }).user_role;
  if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await request.json() as { email: string };
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const admin = createAdminClient();

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  await admin.from('invites').insert({
    email,
    invited_by: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
