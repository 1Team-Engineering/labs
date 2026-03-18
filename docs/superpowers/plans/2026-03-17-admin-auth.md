# Admin Auth & Multi-User Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform OpenMAIC into an invite-only, multi-user training platform with Supabase Auth, role-based access (admin/employee), and shared API key management.

**Architecture:** Supabase Auth with `@supabase/ssr` cookie-based sessions. Admin role stored in `profiles.role`, injected into JWT via custom claims hook. API keys encrypted with `pgp_sym_encrypt` in `org_settings` table, fetched server-side on every generation call. Existing `SettingsDialog` reused for admin key entry with no UI changes.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr`, Supabase Postgres (pgcrypto), TypeScript, Zustand, Tailwind CSS v4, shadcn/ui

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/001_initial_schema.sql` | All tables, RLS, trigger, custom JWT claims function |
| `middleware.ts` | Session validation + role-based route protection |
| `lib/supabase/client.ts` | Browser Supabase client (createBrowserClient) |
| `lib/supabase/server.ts` | Server Supabase client (createServerClient + cookies) |
| `lib/supabase/admin.ts` | Service-role Supabase client (server-only) |
| `lib/org-settings.ts` | getOrgSettings(), syncSettingsToSupabase() |
| `app/login/page.tsx` | Login page wrapper |
| `components/auth/login-form.tsx` | Email/password login form |
| `components/org-settings-hydrator.tsx` | Client component: hydrates Zustand with non-sensitive org meta |
| `app/admin/layout.tsx` | Admin sidebar layout |
| `app/admin/page.tsx` | Admin dashboard (stats + action buttons) |
| `app/admin/users/page.tsx` | User management page |
| `app/admin/library/page.tsx` | Content library page |
| `components/admin/stats-cards.tsx` | Dashboard stat cards |
| `components/admin/user-table.tsx` | Users table with invite button |
| `components/admin/library-table.tsx` | Classrooms table with publish toggle |
| `components/home/library-section.tsx` | Published classrooms section on home page |
| `app/api/admin/settings/route.ts` | POST: encrypt + upsert org settings |
| `app/api/admin/users/route.ts` | GET: list users + invite status |
| `app/api/admin/users/invite/route.ts` | POST: send Supabase invite email |
| `app/api/admin/library/route.ts` | GET: all classrooms for admin |
| `app/api/admin/library/[id]/route.ts` | PATCH: toggle published flag |
| `app/api/org-settings/meta/route.ts` | GET: non-sensitive org settings |
| `app/api/auth/webhook/route.ts` | POST: handle Supabase auth signup event |

### Modified files
| File | Change |
|------|--------|
| `.env.example` | Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ORG_SETTINGS_ENCRYPTION_KEY |
| `package.json` | Add @supabase/ssr dependency |
| `app/layout.tsx` | Add `<OrgSettingsHydrator />` |
| `app/page.tsx` | Gate settings button to admin role only |
| `lib/store/settings.ts` | Call syncSettingsToSupabase() from all setXxxProviderConfig actions |
| `lib/server/provider-config.ts` | Remove client-key-wins from all 7 resolve functions |
| `lib/server/classroom-storage.ts` | Extend persistClassroom() to also write to Supabase classrooms table |

---

## Task 1: Install dependency and update env template

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install @supabase/ssr**

```bash
pnpm add @supabase/ssr
```

Expected: `@supabase/ssr` appears in `package.json` dependencies.

- [ ] **Step 2: Add new env vars to .env.example**

Add this block to `.env.example` after the existing variables:

```env
# --- Supabase Auth -----------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, never prefix with NEXT_PUBLIC_
ORG_SETTINGS_ENCRYPTION_KEY=        # server-only, used for pgp_sym_encrypt/decrypt
SUPABASE_WEBHOOK_SECRET=            # server-only, set in Supabase dashboard Auth → Webhooks
```

- [ ] **Step 3: Create .env.local with real values**

Copy `.env.example` to `.env.local` and fill in the four new Supabase variables from your Supabase project dashboard (Project Settings → API).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add @supabase/ssr dependency and env vars"
```

---

## Task 2: Supabase migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Employees can only see their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can see all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─── org_settings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text NOT NULL UNIQUE,  -- 'providers', 'tts', 'asr', 'pdf', 'image', 'video', 'web-search'
  config_json bytea,                 -- pgp_sym_encrypt(json_text, encryption_key)
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "org_settings_admin_only" ON public.org_settings
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─── classrooms ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classrooms (
  id           uuid PRIMARY KEY,
  title        text NOT NULL DEFAULT '',
  created_by   uuid REFERENCES public.profiles(id),
  published    bool NOT NULL DEFAULT false,
  published_by uuid REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  data         jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Employees see own rows + all published rows
CREATE POLICY "classrooms_select_employee" ON public.classrooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR published = true
  );

-- Employees can insert/update own rows (cannot set published = true)
CREATE POLICY "classrooms_insert_own" ON public.classrooms
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND published = false
  );

CREATE POLICY "classrooms_update_own" ON public.classrooms
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid() AND published = false
  );

-- Admins can select and update all rows (including setting published = true)
CREATE POLICY "classrooms_admin_all" ON public.classrooms
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─── invites ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  invited_by  uuid REFERENCES public.profiles(id),
  accepted_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admin-only
CREATE POLICY "invites_admin_only" ON public.invites
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─── auto-create profile on signup ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── custom JWT claims hook ───────────────────────────────────────────────────
-- Register this function in Supabase dashboard: Auth → Hooks → Custom Access Token Hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims    jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'employee')));
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ─── RPC helpers for org_settings encryption ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_org_setting(
  p_category    text,
  p_config_json text,
  p_key         text,
  p_updated_by  uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.org_settings (category, config_json, updated_by, updated_at)
  VALUES (p_category, pgp_sym_encrypt(p_config_json, p_key), p_updated_by, now())
  ON CONFLICT (category) DO UPDATE
    SET config_json = pgp_sym_encrypt(p_config_json, p_key),
        updated_by  = p_updated_by,
        updated_at  = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_setting(
  p_category text,
  p_key      text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result text;
BEGIN
  SELECT pgp_sym_decrypt(config_json, p_key)::text
  INTO result
  FROM public.org_settings
  WHERE category = p_category;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_org_setting FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.get_org_setting FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.upsert_org_setting TO service_role;
GRANT EXECUTE ON FUNCTION public.get_org_setting TO service_role;
```

- [ ] **Step 2: Run migration in Supabase**

In Supabase dashboard → SQL Editor → paste and run the migration. Or:

```bash
# If using Supabase CLI (optional):
supabase db push
```

- [ ] **Step 3: Register custom JWT hook in dashboard**

Supabase dashboard → Authentication → Hooks → "Custom Access Token" hook → select `public.custom_access_token_hook`.

- [ ] **Step 4: Disable signups in dashboard**

Supabase dashboard → Authentication → Settings → disable "Enable new user signups".

- [ ] **Step 5: Commit migration file**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add Supabase schema — profiles, org_settings, classrooms, invites, RLS, JWT hook"
```

---

## Task 3: Supabase client utilities

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server component — cookie writes ignored
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create admin (service role) client**

Create `lib/supabase/admin.ts`:

```typescript
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
```

Note: `lib/supabase/admin.ts` uses `@supabase/supabase-js` directly (already installed as a peer dep of `@supabase/ssr`).

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase client utilities (browser, server, admin)"
```

---

## Task 4: Middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create middleware**

Create `middleware.ts` at the project root (same level as `package.json`):

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/webhook'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verify session (hits Supabase Auth server — anti-replay)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For /admin/* routes, verify admin role from JWT claims
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const { data: { session } } = await supabase.auth.getSession();
    const userRole = session?.access_token
      ? (JSON.parse(atob(session.access_token.split('.')[1])) as { user_role?: string }).user_role
      : 'employee';

    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logos|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 2: Verify middleware path**

Confirm `middleware.ts` is at the project root (same directory as `next.config.ts`). Next.js only loads middleware from the root.

- [ ] **Step 3: Test middleware locally**

Start dev server:
```bash
pnpm dev
```

Navigate to `http://localhost:3000` — should redirect to `/login`. Navigate to `/login` — should load without redirect.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Supabase auth middleware with role-based routing"
```

---

## Task 5: Login page

**Files:**
- Create: `app/login/page.tsx`
- Create: `components/auth/login-form.tsx`

- [ ] **Step 1: Create login form component**

Create `components/auth/login-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create login page**

Create `app/login/page.tsx`:

```typescript
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">1Team Labs</h1>
          <p className="text-sm text-muted-foreground">Sign in to your training platform</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify login works end-to-end**

1. Create a test user in Supabase dashboard (Auth → Users → Invite user)
2. Set the user's password via the invite email link
3. Navigate to `http://localhost:3000` → redirects to `/login`
4. Sign in → redirects to `/`

- [ ] **Step 4: Commit**

```bash
git add app/login/ components/auth/
git commit -m "feat: add login page with email/password authentication"
```

---

## Task 6: Org settings utility

**Files:**
- Create: `lib/org-settings.ts`

- [ ] **Step 1: Create org-settings module**

Create `lib/org-settings.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

export type SettingsCategory =
  | 'providers'
  | 'tts'
  | 'asr'
  | 'pdf'
  | 'image'
  | 'video'
  | 'web-search';

/** Fetch and decrypt config for a category. Returns null if not set. */
export async function getOrgSettings<T = unknown>(category: SettingsCategory): Promise<T | null> {
  const encryptionKey = process.env.ORG_SETTINGS_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.warn('[org-settings] ORG_SETTINGS_ENCRYPTION_KEY not set — falling back to env vars');
    return null;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_org_setting', {
    p_category: category,
    p_key: encryptionKey,
  });

  if (error || !data) return null;
  try {
    return JSON.parse(data as string) as T;
  } catch {
    return null;
  }
}

/** Encrypt and upsert config for a category. Called server-side from admin API route. */
export async function upsertOrgSettings(
  category: SettingsCategory,
  config: unknown,
  updatedBy: string,
): Promise<void> {
  const encryptionKey = process.env.ORG_SETTINGS_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ORG_SETTINGS_ENCRYPTION_KEY is not set');

  const supabase = createAdminClient();

  const { error } = await supabase.rpc('upsert_org_setting', {
    p_category: category,
    p_config_json: JSON.stringify(config),
    p_key: encryptionKey,
    p_updated_by: updatedBy,
  });

  if (error) throw error;
}
```

- [ ] **Step 2: Add SQL helper functions to migration**

These functions are already included in `supabase/migrations/001_initial_schema.sql` from Task 2. Verify they are present at the bottom of that file:

```sql
-- ─── RPC helpers for org_settings encryption ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_org_setting(
  p_category   text,
  p_config_json text,
  p_key        text,
  p_updated_by uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.org_settings (category, config_json, updated_by, updated_at)
  VALUES (p_category, pgp_sym_encrypt(p_config_json, p_key), p_updated_by, now())
  ON CONFLICT (category) DO UPDATE
    SET config_json = pgp_sym_encrypt(p_config_json, p_key),
        updated_by  = p_updated_by,
        updated_at  = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_setting(
  p_category text,
  p_key      text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result text;
BEGIN
  SELECT pgp_sym_decrypt(config_json, p_key)::text
  INTO result
  FROM public.org_settings
  WHERE category = p_category;
  RETURN result;
END;
$$;

-- Only service role can call these (client cannot call RPC with service role key)
REVOKE EXECUTE ON FUNCTION public.upsert_org_setting FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.get_org_setting FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.upsert_org_setting TO service_role;
GRANT EXECUTE ON FUNCTION public.get_org_setting TO service_role;
```

Run the new SQL functions in Supabase SQL editor.

- [ ] **Step 3: Commit**

```bash
git add lib/org-settings.ts supabase/migrations/001_initial_schema.sql
git commit -m "feat: add org-settings module with pgp_sym_encrypt/decrypt via Supabase RPC"
```

---

## Task 7: Admin API routes

**Files:**
- Create: `app/api/admin/settings/route.ts`
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/invite/route.ts`
- Create: `app/api/admin/library/route.ts`
- Create: `app/api/admin/library/[id]/route.ts`
- Create: `app/api/auth/webhook/route.ts`
- Create: `app/api/org-settings/meta/route.ts`

- [ ] **Step 1: Create admin settings route**

Create `app/api/admin/settings/route.ts`:

```typescript
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
```

- [ ] **Step 2: Create admin users routes**

Create `app/api/admin/users/route.ts`:

```typescript
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

  // Get profiles for role info
  const { data: profiles } = await admin.from('profiles').select('id, role, full_name');
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Get invites for pending status
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
```

Create `app/api/admin/users/invite/route.ts`:

```typescript
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

  // Track invite
  await admin.from('invites').insert({
    email,
    invited_by: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create admin library routes**

Create `app/api/admin/library/route.ts`:

```typescript
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
  const { data, error } = await admin
    .from('classrooms')
    .select('id, title, created_by, published, published_by, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classrooms: data });
}
```

Create `app/api/admin/library/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (JSON.parse(atob(session.access_token.split('.')[1])) as { user_role?: string }).user_role;
  if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { published } = await request.json() as { published: boolean };
  const admin = createAdminClient();

  const { error } = await admin
    .from('classrooms')
    .update({
      published,
      published_by: published ? session.user.id : null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create auth webhook route**

Create `app/api/auth/webhook/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Supabase sends a webhook secret in the Authorization header
// Set SUPABASE_WEBHOOK_SECRET in .env.local to enable verification
export async function POST(request: Request) {
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await request.json() as { type: string; record?: { email?: string } };

  // Only handle signup events
  if (body.type !== 'INSERT' || !body.record?.email) {
    return NextResponse.json({ ok: true });
  }

  const email = body.record.email;
  const admin = createAdminClient();

  // Mark invite as accepted (idempotent: only updates if accepted_at IS NULL)
  await admin
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('email', email)
    .is('accepted_at', null);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Create org-settings meta route**

Create `app/api/org-settings/meta/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgSettings } from '@/lib/org-settings';

// Returns non-sensitive settings for client hydration (NO key values)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all categories
  const [providers, tts, asr, pdf, image, video, webSearch] = await Promise.all([
    getOrgSettings<Record<string, { name?: string; type?: string; models?: unknown[]; defaultBaseUrl?: string; icon?: string; requiresApiKey?: boolean; isBuiltIn?: boolean }>>(
      'providers',
    ),
    getOrgSettings<Record<string, unknown>>('tts'),
    getOrgSettings<Record<string, unknown>>('asr'),
    getOrgSettings<Record<string, unknown>>('pdf'),
    getOrgSettings<Record<string, unknown>>('image'),
    getOrgSettings<Record<string, unknown>>('video'),
    getOrgSettings<Record<string, unknown>>('web-search'),
  ]);

  // Strip apiKey fields from providers before sending to client
  const safeProviders = providers
    ? Object.fromEntries(
        Object.entries(providers).map(([id, cfg]) => [
          id,
          { ...cfg, apiKey: '', baseUrl: cfg.baseUrl ?? '' },
        ]),
      )
    : null;

  const stripKeys = (cfg: Record<string, unknown> | null) =>
    cfg
      ? Object.fromEntries(
          Object.entries(cfg).map(([id, v]) => [id, { ...(v as object), apiKey: '' }]),
        )
      : null;

  return NextResponse.json({
    providers: safeProviders,
    tts: stripKeys(tts as Record<string, unknown> | null),
    asr: stripKeys(asr as Record<string, unknown> | null),
    pdf: stripKeys(pdf as Record<string, unknown> | null),
    image: stripKeys(image as Record<string, unknown> | null),
    video: stripKeys(video as Record<string, unknown> | null),
    webSearch: stripKeys(webSearch as Record<string, unknown> | null),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/ app/api/auth/ app/api/org-settings/
git commit -m "feat: add admin API routes (settings, users, library, webhook, org-meta)"
```

---

## Task 8: OrgSettingsHydrator + layout wiring

**Files:**
- Create: `components/org-settings-hydrator.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create the hydrator component**

Create `components/org-settings-hydrator.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings';

// Fetches non-sensitive org settings on mount and hydrates the Zustand store.
// API keys are never included in this response — keys are injected server-side
// in generation API routes.
export function OrgSettingsHydrator() {
  const setProvidersConfig = useSettingsStore((s) => s.setProvidersConfig);

  useEffect(() => {
    async function hydrate() {
      try {
        const res = await fetch('/api/org-settings/meta');
        if (!res.ok) return;
        const data = await res.json() as {
          providers?: Record<string, unknown> | null;
        };

        if (data.providers) {
          // Merge org provider metadata (no keys) into existing store config.
          // This ensures provider names, icons, and models are visible to all users.
          const current = useSettingsStore.getState().providersConfig;
          const merged = { ...current };
          for (const [id, cfg] of Object.entries(data.providers)) {
            merged[id as keyof typeof merged] = {
              ...merged[id as keyof typeof merged],
              ...(cfg as object),
              // Never overwrite local apiKey with empty string from server meta
              apiKey: (merged[id as keyof typeof merged] as { apiKey?: string })?.apiKey || '',
            };
          }
          setProvidersConfig(merged);
        }
      } catch {
        // Non-fatal — app works without org settings (falls back to env vars)
      }
    }
    void hydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
```

- [ ] **Step 2: Add hydrator to root layout**

Modify `app/layout.tsx` — add `OrgSettingsHydrator` import and component:

```typescript
// Add import:
import { OrgSettingsHydrator } from '@/components/org-settings-hydrator';

// In RootLayout, add after <ServerProvidersInit />:
<ServerProvidersInit />
<OrgSettingsHydrator />
```

- [ ] **Step 3: Commit**

```bash
git add components/org-settings-hydrator.tsx app/layout.tsx
git commit -m "feat: add OrgSettingsHydrator to hydrate Zustand with non-sensitive org provider metadata"
```

---

## Task 9: Gate settings icon to admins

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add role detection to home page**

In `app/page.tsx`, the settings button is rendered around line 459. Wrap it with a role check.

First, add a hook/effect at the top of the component to detect the user's role from the Supabase session:

```typescript
// Add at the top of the component alongside other state:
const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);

useEffect(() => {
  async function fetchRole() {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1])) as { user_role?: string };
      setUserRole((payload.user_role as 'admin' | 'employee') ?? 'employee');
    } catch {
      setUserRole('employee');
    }
  }
  void fetchRole();
}, []);
```

- [ ] **Step 2: Conditionally render settings button**

Find the settings button JSX (around line 459 in `app/page.tsx`) and wrap it:

```typescript
{userRole === 'admin' && (
  <div className="relative">
    {/* existing settings button JSX unchanged */}
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: gate settings icon to admin role only"
```

---

## Task 10: Remove client-key-wins from all resolve functions

**Files:**
- Modify: `lib/server/provider-config.ts`

The existing `resolveApiKey` and 6 sibling functions all have a pattern like:
```typescript
if (clientKey) return clientKey;  // ← REMOVE THIS
return serverKey ?? '';
```

- [ ] **Step 1: Read the current file**

Open `lib/server/provider-config.ts` and identify all 7 resolve functions:
`resolveApiKey`, `resolveTTSApiKey`, `resolveASRApiKey`, `resolvePDFApiKey`, `resolveImageApiKey`, `resolveVideoApiKey`, `resolveWebSearchApiKey`.

- [ ] **Step 2: Remove client-key-wins branch from all 7**

For each function, remove the `if (clientKey) return clientKey;` line (or equivalent client-priority block). Each function should only return the server-configured key (env var / YAML), never the client-provided one.

Example before:
```typescript
export function resolveApiKey(providerId: string, clientKey?: string): string {
  if (clientKey) return clientKey;  // ← remove
  return getServerConfig().providers[providerId]?.apiKey ?? '';
}
```

Example after:
```typescript
export function resolveApiKey(providerId: string, _clientKey?: string): string {
  return getServerConfig().providers[providerId]?.apiKey ?? '';
}
```

Keep the `clientKey` parameter in the function signature (to avoid breaking callers) but prefix with `_` to indicate it's intentionally unused.

- [ ] **Step 3: Verify callers still compile**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Fix any type errors from the parameter change.

- [ ] **Step 4: Commit**

```bash
git add lib/server/provider-config.ts
git commit -m "security: remove client-key-wins from all resolve functions — org keys only"
```

---

## Task 11: Sync settings store to Supabase

**Files:**
- Modify: `lib/store/settings.ts`

- [ ] **Step 1: Add syncSettingsToSupabase helper**

At the top of `lib/store/settings.ts`, add a helper that debounces and calls the admin settings API. This only fires when the user is an admin (the API route enforces this, so a failed call from an employee is silently ignored):

```typescript
// Add near the top of the file (after imports):
async function syncCategoryToSupabase(category: string, config: unknown) {
  try {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, config }),
    });
  } catch {
    // Non-fatal — local state is still saved
  }
}
```

- [ ] **Step 2: Call sync from setProviderConfig**

In `lib/store/settings.ts`, find the `setProviderConfig` action. After the existing Zustand state update, add:

```typescript
// After updating state:
void syncCategoryToSupabase('providers', get().providersConfig);
```

Do the same for:
- `setTTSProviderConfig` → `syncCategoryToSupabase('tts', get().ttsProvidersConfig)`
- `setASRProviderConfig` → `syncCategoryToSupabase('asr', get().asrProvidersConfig)`
- `setPDFProviderConfig` → `syncCategoryToSupabase('pdf', get().pdfProvidersConfig)`
- `setImageProviderConfig` → `syncCategoryToSupabase('image', get().imageProvidersConfig)`
- `setVideoProviderConfig` → `syncCategoryToSupabase('video', get().videoProvidersConfig)`
- `setWebSearchProviderConfig` → `syncCategoryToSupabase('web-search', get().webSearchProvidersConfig)`

- [ ] **Step 3: Test sync works**

1. Log in as admin
2. Open Settings dialog → change an API key
3. Check Supabase dashboard → Table Editor → `org_settings` → verify a row was inserted/updated

- [ ] **Step 4: Commit**

```bash
git add lib/store/settings.ts
git commit -m "feat: sync provider config changes to Supabase org_settings from store setters"
```

---

## Task 12: Wire generation routes to use org settings

**Files:**
- Modify: `lib/server/provider-config.ts` (add getOrgSettings fallback)

Currently `resolveApiKey` reads from `getServerConfig()` (YAML + env vars). We need it to also check `org_settings` if no env var key is found.

- [ ] **Step 1: Add org settings fallback to all resolve functions**

Modify `lib/server/provider-config.ts` to add async versions for all 7 categories:

```typescript
import { getOrgSettings } from '@/lib/org-settings';

type ProviderCfg = Record<string, { apiKey?: string; baseUrl?: string }>;

// ── LLM providers ────────────────────────────────────────────────────────────
export async function resolveApiKeyAsync(providerId: string): Promise<string> {
  const serverKey = getServerConfig().providers[providerId]?.apiKey;
  if (serverKey) return serverKey;
  const org = await getOrgSettings<ProviderCfg>('providers');
  return org?.[providerId]?.apiKey ?? '';
}

export async function resolveBaseUrlAsync(providerId: string): Promise<string | undefined> {
  const serverUrl = getServerConfig().providers[providerId]?.baseUrl;
  if (serverUrl) return serverUrl;
  const org = await getOrgSettings<ProviderCfg>('providers');
  return org?.[providerId]?.baseUrl;
}

// ── TTS ───────────────────────────────────────────────────────────────────────
export async function resolveTTSApiKeyAsync(providerId: string): Promise<string> {
  const serverKey = getServerConfig().tts[providerId]?.apiKey;
  if (serverKey) return serverKey;
  const org = await getOrgSettings<ProviderCfg>('tts');
  return org?.[providerId]?.apiKey ?? '';
}

export async function resolveTTSBaseUrlAsync(providerId: string): Promise<string | undefined> {
  const serverUrl = getServerConfig().tts[providerId]?.baseUrl;
  if (serverUrl) return serverUrl;
  const org = await getOrgSettings<ProviderCfg>('tts');
  return org?.[providerId]?.baseUrl;
}

// ── ASR ───────────────────────────────────────────────────────────────────────
export async function resolveASRApiKeyAsync(providerId: string): Promise<string> {
  const serverKey = getServerConfig().asr[providerId]?.apiKey;
  if (serverKey) return serverKey;
  const org = await getOrgSettings<ProviderCfg>('asr');
  return org?.[providerId]?.apiKey ?? '';
}

// ── PDF ───────────────────────────────────────────────────────────────────────
export async function resolvePDFApiKeyAsync(providerId: string): Promise<string> {
  const serverKey = getServerConfig().pdf[providerId]?.apiKey;
  if (serverKey) return serverKey;
  const org = await getOrgSettings<ProviderCfg>('pdf');
  return org?.[providerId]?.apiKey ?? '';
}

// ── Image generation ──────────────────────────────────────────────────────────
export async function resolveImageApiKeyAsync(providerId: string): Promise<string> {
  const serverKey = getServerConfig().image[providerId]?.apiKey;
  if (serverKey) return serverKey;
  const org = await getOrgSettings<ProviderCfg>('image');
  return org?.[providerId]?.apiKey ?? '';
}

// ── Video generation ──────────────────────────────────────────────────────────
export async function resolveVideoApiKeyAsync(providerId: string): Promise<string> {
  const serverKey = getServerConfig().video[providerId]?.apiKey;
  if (serverKey) return serverKey;
  const org = await getOrgSettings<ProviderCfg>('video');
  return org?.[providerId]?.apiKey ?? '';
}

// ── Web search ────────────────────────────────────────────────────────────────
export async function resolveWebSearchApiKeyAsync(providerId: string): Promise<string> {
  const serverKey = getServerConfig().webSearch[providerId]?.apiKey;
  if (serverKey) return serverKey;
  const org = await getOrgSettings<ProviderCfg>('web-search');
  return org?.[providerId]?.apiKey ?? '';
}
```

> Note: The existing sync functions `getServerConfig()` return `providers`, `tts`, `asr`, `pdf`, `image`, `video`, `webSearch` sub-objects keyed by provider ID. Match the exact key names already used in the file.

- [ ] **Step 2: Update key API routes to use async resolve**

For the primary generation routes (`/api/chat`, `/api/generate/scene-content`, `/api/generate/tts`, etc.), replace calls to `resolveApiKey(id, body.apiKey)` with `await resolveApiKeyAsync(id)`.

The specific routes to update can be found with:

```bash
grep -r "resolveApiKey\|resolveTTSApiKey\|resolveASRApiKey\|resolveImageApiKey\|resolveVideoApiKey\|resolveWebSearchApiKey" app/api --include="*.ts" -l
```

Update each file found.

- [ ] **Step 3: Build check**

```bash
pnpm build
```

Fix any type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/server/provider-config.ts app/api/
git commit -m "feat: wire generation routes to use org_settings as key source fallback"
```

---

## Task 13: Extend classroom storage to Supabase

**Files:**
- Modify: `lib/server/classroom-storage.ts`

- [ ] **Step 1: Add Supabase write to persistClassroom**

Modify `lib/server/classroom-storage.ts`. Add a Supabase write after the existing file write. The function must also accept the current user's ID to populate `created_by`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

export async function persistClassroom(
  data: { id: string; stage: Stage; scenes: Scene[]; userId?: string },
  baseUrl: string,
): Promise<PersistedClassroomData & { url: string }> {
  const classroomData: PersistedClassroomData = {
    id: data.id,
    stage: data.stage,
    scenes: data.scenes,
    createdAt: new Date().toISOString(),
  };

  // Existing file write (keep for backward compatibility)
  await ensureClassroomsDir();
  const filePath = path.join(CLASSROOMS_DIR, `${data.id}.json`);
  await writeJsonFileAtomic(filePath, classroomData);

  // Also write to Supabase if userId is provided
  if (data.userId) {
    try {
      const supabase = createAdminClient();
      const title = (data.stage as { config?: { title?: string } }).config?.title ?? data.id;
      await supabase.from('classrooms').upsert({
        id: data.id,
        title,
        created_by: data.userId,
        data: { stage: data.stage, scenes: data.scenes },
        created_at: classroomData.createdAt,
      });
    } catch (err) {
      console.error('[classroom-storage] Supabase write failed (file fallback used):', err);
    }
  }

  return { ...classroomData, url: `${baseUrl}/classroom/${data.id}` };
}
```

- [ ] **Step 2: Pass userId from classroom generation route**

In `app/api/generate-classroom/route.ts` (or equivalent), extract the authenticated user ID and pass it to `persistClassroom`:

```typescript
// Get user from Supabase session
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Pass userId to persistClassroom
await persistClassroom({ id, stage, scenes, userId: user?.id }, baseUrl);
```

- [ ] **Step 3: Commit**

```bash
git add lib/server/classroom-storage.ts app/api/generate-classroom/
git commit -m "feat: extend classroom storage to persist to Supabase classrooms table"
```

---

## Task 14: Admin UI

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/library/page.tsx`
- Create: `components/admin/stats-cards.tsx`
- Create: `components/admin/user-table.tsx`
- Create: `components/admin/library-table.tsx`

- [ ] **Step 1: Create admin layout with sidebar**

Create `app/admin/layout.tsx`:

```typescript
import Link from 'next/link';
import { LayoutDashboard, Users, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/library', label: 'Library', icon: BookOpen },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30 flex flex-col p-4 gap-1">
        <div className="px-3 py-2 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Admin
          </h2>
        </div>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              'hover:bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        <div className="mt-auto">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to App
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create stats cards component**

Create `components/admin/stats-cards.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

interface Stats {
  userCount: number;
  classroomCount: number;
  lastKeyUpdate: string | null;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [usersRes, libraryRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/library'),
      ]);
      const users = await usersRes.json() as { users: unknown[] };
      const library = await libraryRes.json() as { classrooms: unknown[] };
      setStats({
        userCount: users.users?.length ?? 0,
        classroomCount: library.classrooms?.length ?? 0,
        lastKeyUpdate: null,
      });
    }
    void load();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Users', value: stats?.userCount ?? '—' },
        { label: 'Classrooms', value: stats?.classroomCount ?? '—' },
        { label: 'Keys Updated', value: stats?.lastKeyUpdate ?? 'Never' },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create admin dashboard page**

Create `app/admin/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCards } from '@/components/admin/stats-cards';
import { SettingsDialog } from '@/components/settings';

export default function AdminDashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your training platform</p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-3 gap-4">
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-5 w-5" />
          Platform Settings
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" asChild>
          <Link href="/admin/users">
            <Users className="h-5 w-5" />
            Manage Users
          </Link>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" asChild>
          <Link href="/admin/library">
            <BookOpen className="h-5 w-5" />
            Content Library
          </Link>
        </Button>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
```

- [ ] **Step 4: Create user table component**

Create `components/admin/user-table.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: 'active' | 'pending';
  created_at: string;
}

interface UserTableProps {
  users: User[];
  onInvited: () => void;
}

export function UserTable({ users, onInvited }: UserTableProps) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const res = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setInviting(false);
    if (res.ok) {
      toast.success(`Invite sent to ${email}`);
      setEmail('');
      onInvited();
    } else {
      const err = await res.json() as { error: string };
      toast.error(err.error ?? 'Failed to send invite');
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className="flex gap-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="employee@company.com"
          className="max-w-sm"
          required
        />
        <Button type="submit" disabled={inviting}>
          {inviting ? 'Sending…' : 'Invite Employee'}
        </Button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-3 pr-6">Email</th>
            <th className="pb-3 pr-6">Name</th>
            <th className="pb-3 pr-6">Role</th>
            <th className="pb-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="py-3 pr-6">{u.email}</td>
              <td className="py-3 pr-6 text-muted-foreground">{u.full_name || '—'}</td>
              <td className="py-3 pr-6">
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
              </td>
              <td className="py-3">
                <Badge variant={u.status === 'active' ? 'outline' : 'secondary'}>
                  {u.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Create users page**

Create `app/admin/users/page.tsx`:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { UserTable } from '@/components/admin/user-table';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: 'active' | 'pending';
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json() as { users: User[] };
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Users</h1>
      <UserTable users={users} onInvited={loadUsers} />
    </div>
  );
}
```

- [ ] **Step 6: Create library table and page**

Create `components/admin/library-table.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Classroom {
  id: string;
  title: string;
  created_by: string;
  published: boolean;
  created_at: string;
}

export function LibraryTable({ classrooms: initial }: { classrooms: Classroom[] }) {
  const [classrooms, setClassrooms] = useState(initial);

  async function togglePublished(id: string, published: boolean) {
    const res = await fetch(`/api/admin/library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    });
    if (res.ok) {
      setClassrooms((prev) => prev.map((c) => (c.id === id ? { ...c, published } : c)));
      toast.success(published ? 'Published to library' : 'Removed from library');
    } else {
      toast.error('Failed to update');
    }
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-3 pr-6">Title</th>
          <th className="pb-3 pr-6">Created</th>
          <th className="pb-3">Published</th>
        </tr>
      </thead>
      <tbody>
        {classrooms.map((c) => (
          <tr key={c.id} className="border-b last:border-0">
            <td className="py-3 pr-6 font-medium">{c.title || c.id}</td>
            <td className="py-3 pr-6 text-muted-foreground">
              {new Date(c.created_at).toLocaleDateString()}
            </td>
            <td className="py-3">
              <Switch
                checked={c.published}
                onCheckedChange={(v) => void togglePublished(c.id, v)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Create `app/admin/library/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { LibraryTable } from '@/components/admin/library-table';

interface Classroom {
  id: string;
  title: string;
  created_by: string;
  published: boolean;
  created_at: string;
}

export default function LibraryPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  useEffect(() => {
    fetch('/api/admin/library')
      .then((r) => r.json())
      .then((d: { classrooms: Classroom[] }) => setClassrooms(d.classrooms ?? []));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Content Library</h1>
      <p className="text-muted-foreground text-sm">
        Toggle classrooms to publish them to the shared employee library.
      </p>
      <LibraryTable classrooms={classrooms} />
    </div>
  );
}
```

- [ ] **Step 7: Build check**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -30
```

Fix any type errors.

- [ ] **Step 8: Commit**

```bash
git add app/admin/ components/admin/
git commit -m "feat: add admin UI — dashboard, users, library with stats and invite flow"
```

---

## Task 15: Employee library section on home page

**Files:**
- Create: `components/home/library-section.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create library section component**

Create `components/home/library-section.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LibraryClassroom {
  id: string;
  title: string;
  created_at: string;
}

export function LibrarySection() {
  const [classrooms, setClassrooms] = useState<LibraryClassroom[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('classrooms')
        .select('id, title, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(12);
      setClassrooms(data ?? []);
    }
    void load();
  }, []);

  if (classrooms.length === 0) return null;

  return (
    <section className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Training Library
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {classrooms.map((c) => (
          <Link
            key={c.id}
            href={`/classroom/${c.id}`}
            className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors space-y-1"
          >
            <p className="font-medium text-sm truncate">{c.title || c.id}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(c.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add library section to home page**

In `app/page.tsx`, find an appropriate place (below the main content generation area, before the footer if any) and add:

```typescript
import { LibrarySection } from '@/components/home/library-section';

// In the JSX:
<LibrarySection />
```

- [ ] **Step 3: Commit**

```bash
git add components/home/library-section.tsx app/page.tsx
git commit -m "feat: add published classroom library section to employee home page"
```

---

## Task 16: Final verification and first admin setup

- [ ] **Step 1: Full build check**

```bash
pnpm build
```

All must pass with 0 errors.

- [ ] **Step 2: Create first admin user**

1. In Supabase dashboard → Authentication → Users → "Invite user" → enter your email
2. Accept invite, set password
3. In Supabase dashboard → Table Editor → `profiles` → find your row → set `role = 'admin'`
4. Log out and log back in (to refresh JWT with new role)
5. Navigate to `http://localhost:3000/admin` → should load the dashboard

- [ ] **Step 3: End-to-end smoke test**

- [ ] Log in as admin → see settings icon → open Settings → configure one API key → verify `org_settings` row in Supabase
- [ ] Admin: navigate to `/admin/users` → invite a test employee email
- [ ] Employee: accept invite, sign in → cannot see settings icon → can create a classroom
- [ ] Admin: go to `/admin/library` → publish the classroom → toggle published on
- [ ] Employee: refresh home page → see classroom in Library section
- [ ] Generate a classroom as employee → verify it works (org API keys used)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete admin auth & multi-user training platform implementation"
```

---

## Setup Checklist (for first-time deployment)

1. Create Supabase project
2. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL editor
3. Register `custom_access_token_hook` in Supabase dashboard: Auth → Hooks → Custom Access Token
4. Disable signups: Supabase dashboard → Auth → Settings → disable "Enable new user signups"
5. Configure Auth webhook: Supabase dashboard → Auth → Webhooks → add `POST /api/auth/webhook` for `signup` event
6. Add env vars to `.env.local` (all 4 Supabase variables)
7. `pnpm install` (picks up @supabase/ssr)
8. Create first admin user manually in Supabase Auth dashboard → set `profiles.role = 'admin'`
