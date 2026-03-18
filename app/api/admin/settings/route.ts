import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertOrgSettings, type SettingsCategory } from '@/lib/org-settings';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (JSON.parse(atob(session.access_token.split('.')[1])) as { user_role?: string }).user_role;
  if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { category, config } = await request.json() as { category: SettingsCategory; config: unknown };

  if (!category || !config) {
    return NextResponse.json({ error: 'Missing category or config' }, { status: 400 });
  }

  await upsertOrgSettings(category, config, session.user.id);
  return NextResponse.json({ ok: true });
}
