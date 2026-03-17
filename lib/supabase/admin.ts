import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Only import this in server-side code (API routes, server actions).
// Never import in 'use client' components or expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
