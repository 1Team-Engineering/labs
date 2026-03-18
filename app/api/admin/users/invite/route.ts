import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function POST(request: Request) {
  const { user, error: authError } = await requireAdmin();
  if (authError) return authError;

  const { email } = await request.json() as { email: string };
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const admin = createAdminClient();

  // Pre-check: reject if a pending invite already exists for this email
  const { data: existingInvite } = await admin
    .from('invites')
    .select('email, accepted_at')
    .eq('email', email)
    .is('accepted_at', null)
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json(
      { error: 'An invite has already been sent to this email.' },
      { status: 409 },
    );
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError) {
    const msg = inviteError.message ?? '';
    const friendlyMessage =
      msg.toLowerCase().includes('not allowed') || msg.toLowerCase().includes('domain')
        ? 'This email domain is not allowed. Check Authentication settings in the Supabase dashboard.'
        : msg;
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }

  await admin.from('invites').insert({
    email,
    invited_by: user.id,
  });

  return NextResponse.json({ ok: true });
}
