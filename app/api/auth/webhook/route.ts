import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await request.json() as { type: string; record?: { email?: string } };

  if (body.type !== 'INSERT' || !body.record?.email) {
    return NextResponse.json({ ok: true });
  }

  const email = body.record.email;
  const admin = createAdminClient();

  await admin
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('email', email)
    .is('accepted_at', null);

  return NextResponse.json({ ok: true });
}
