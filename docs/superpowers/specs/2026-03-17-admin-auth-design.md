# Admin Auth & Multi-User Design Spec
**Date:** 2026-03-17
**Status:** Approved
**Project:** OpenMAIC — Internal Training Platform

---

## Overview

Transform OpenMAIC from a single-user, localStorage-configured app into a multi-user internal training platform. Admins configure shared API keys and manage users; employees consume and create training classrooms. Access is gated by Supabase Auth with role-based routing.

---

## Goals

- Gate the entire app behind Supabase Auth (invite-only)
- Admins configure shared API keys via the existing `SettingsDialog` (no new UI for key entry)
- Employee API calls use admin-configured keys server-side (keys never in employee browser sessions)
- Employees can create private classrooms and take classrooms from a shared library
- Only admins can publish classrooms to the shared library
- Admin role is assigned manually in the Supabase dashboard

---

## Security Model

**Admin browser session:** The admin uses the existing `SettingsDialog` to enter API keys. Those keys are stored in the admin's localStorage (via Zustand) AND synced to Supabase `org_settings` (encrypted). The admin's own browser having keys is an accepted, intentional behavior — admins are trusted operators.

**Employee browser sessions:** Employees never receive key values. Their Zustand store is hydrated with only non-sensitive settings (provider ID, model ID, voice selection). All LLM/TTS/image API calls go through Next.js API routes that fetch keys server-side via `getOrgSettings()`. The `resolveApiKey()` function's client-key-wins priority is disabled for authenticated sessions — `body.apiKey` from the request body is ignored; only server-fetched org settings are used.

---

## Database Schema

### `profiles`
Extends `auth.users`. Created automatically via a Supabase trigger on user signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | FK → `auth.users.id`, PK |
| `role` | `text` | `CHECK IN ('admin', 'employee')`, DEFAULT `'employee'` |
| `full_name` | `text` | |
| `created_at` | `timestamptz` | |

**Trigger:** `CREATE FUNCTION handle_new_user()` on `auth.users` INSERT → inserts into `profiles`.

### `org_settings`
One row per provider group (LLM providers, TTS, ASR, image, video, web search). Config stored as encrypted JSON blob.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `category` | `text` | e.g. `'providers'`, `'tts'`, `'image'`, `'video'`, `'asr'`, `'web-search'`, `'pdf'` |
| `config_json` | `bytea` | Full category config encrypted via `pgp_sym_encrypt` |
| `updated_by` | `uuid` | FK → `profiles.id` |
| `updated_at` | `timestamptz` | |

**Row format example:** One row per settings category mirrors the Zustand store shape. The `config_json` column holds the entire `providersConfig` object (or `ttsProvidersConfig`, etc.) serialized to JSON, then encrypted with `pgp_sym_encrypt(text, key)` where `key` comes from the server env var `ORG_SETTINGS_ENCRYPTION_KEY`.

**Encryption SQL pattern:**
```sql
-- Write
UPDATE org_settings SET config_json = pgp_sym_encrypt($1::text, $2)
WHERE category = $3;

-- Read
SELECT pgp_sym_decrypt(config_json, $1)::text FROM org_settings WHERE category = $2;
```
`$2` in both cases is `process.env.ORG_SETTINGS_ENCRYPTION_KEY` injected at query time from the server.

**RLS:** Admin-only SELECT/INSERT/UPDATE. No employee access at the DB level.

### `classrooms`
**Extends** the existing file-based `lib/server/classroom-storage.ts`. All new classroom saves write to this table; existing file-based classrooms remain accessible via the old path during a transition period.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK — matches the existing `PersistedClassroomData.id` |
| `title` | `text` | Derived from `stage.config.title` (or generation outline title) at save time |
| `created_by` | `uuid` | FK → `profiles.id` |
| `published` | `bool` | DEFAULT `false` |
| `published_by` | `uuid` | FK → `profiles.id`, nullable |
| `created_at` | `timestamptz` | |
| `data` | `jsonb` | The `{ stage, scenes }` payload from `PersistedClassroomData` (excludes `id` and `createdAt` which are top-level columns) |

**RLS:**
- Employees: SELECT own rows + all `published = true` rows; INSERT/UPDATE own rows; cannot set `published = true`
- Admins: SELECT/UPDATE all rows; can set `published = true`

### `invites`
Tracks pending and accepted email invitations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `email` | `text` | |
| `invited_by` | `uuid` | FK → `profiles.id` |
| `accepted_at` | `timestamptz` | Nullable — set by Auth webhook |
| `created_at` | `timestamptz` | |

**Invite acceptance tracking:** A Supabase Auth webhook (configured in Supabase dashboard under Auth → Webhooks) fires on the `signup` event (not `login` — signup fires once when the invited user creates their account). The webhook calls `POST /api/auth/webhook` which checks `WHERE email = $1 AND accepted_at IS NULL` and sets `accepted_at = now()`. This is idempotent: subsequent logins are unaffected.

---

## Authentication & Routing

### Required Package
`@supabase/ssr` (not `@supabase/supabase-js` directly). Provides cookie-based session management compatible with Next.js App Router server components and middleware.

### Login Flow
- Single `/login` page: email + password via Supabase Auth
- No self-registration: `enable_signup = false` in `supabase/config.toml` (or disabled in Supabase dashboard under Auth → Settings → "Disable signups")
- After login, redirect to `/` (employee) or `/admin` (admin)

### Invite Flow
1. Admin visits `/admin/users` → enters employee email → clicks "Invite"
2. App calls `POST /api/admin/users/invite` → server uses `lib/supabase/admin.ts` (service role) → calls `supabase.auth.admin.inviteUserByEmail()`
3. Employee receives Supabase magic-link email → sets password → `profiles` row auto-created (via trigger) with `role = 'employee'`
4. Employee logs in → Auth webhook fires → `invites.accepted_at` updated

### JWT Custom Claims (Required Setup)
Supabase does not inject `profiles.role` into the JWT automatically. A custom claims hook is required:

```sql
-- Register in Supabase dashboard: Auth → Hooks → Custom Access Token Hook
CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = (event->>'user_id')::uuid;
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'employee')));
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

This function must be registered as the "Custom Access Token" hook in the Supabase dashboard. After this, every JWT contains `claims.user_role`.

### Middleware (`middleware.ts`)
Uses `@supabase/ssr` `createServerClient` with cookie storage. Calls `supabase.auth.getUser()` (not `getSession()`) on every request — this verifies the JWT signature server-side, not just decode it. Role is read from the verified JWT claims.

```
Request → middleware.ts
  → supabase.auth.getUser() → verifies JWT with Supabase Auth server (anti-replay)
    → no valid session? → /login
  → supabase.auth.getSession() → read access_token JWT claims → extract user_role
  → path starts with /admin → check user_role === 'admin'
    → not admin? → redirect /
  → all other protected paths → allow
  → supabase.auth.getUser() also refreshes expired tokens via @supabase/ssr cookie handling
```

Note: `getUser()` is used for session validity (it hits the Supabase Auth server); `getSession()` is used to read the decoded JWT claims (including `user_role`) without an extra network round-trip. Both are called in middleware.

| Path | Rule |
|------|------|
| `/login` | Public |
| `/api/auth/webhook` | Public (Supabase webhook signature verified in handler) |
| `/` | Requires auth |
| `/classroom/*` | Requires auth |
| `/admin/*` | Requires auth + `user_role = 'admin'` |

### Admin Role Assignment
Set manually in the Supabase dashboard: `UPDATE profiles SET role = 'admin' WHERE id = '<uuid>'`. No UI needed.

---

## Admin Interface

### `/admin` — Dashboard
- Stats: user count, classroom count, last key rotation timestamp (from `org_settings.updated_at`)
- Action buttons:
  - **Platform Settings** → opens existing `<SettingsDialog />` (admin-only)
  - **Manage Users** → links to `/admin/users`
  - **Content Library** → links to `/admin/library`

### `/admin/users` — User Management
- Table: email, name, role, status (pending invite / active)
- "Invite Employee" button → email input → `POST /api/admin/users/invite`
- Supabase handles password reset emails

### `/admin/library` — Content Library
- Table: all classrooms across all users (title, creator, created date, published status)
- Toggle `published` flag → `PATCH /api/admin/library/[id]`

### Settings Access
- The existing `<SettingsDialog />` is reused for key entry without modifying its UI
- The settings icon in the home page header is shown only when `user_role === 'admin'`
- "Platform Settings" button on the admin dashboard opens the same dialog
- `syncSettingsToSupabase()` is triggered from the Zustand store setters (e.g., `setProviderConfig`, `setTTSProviderConfig`, etc.) — not from the dialog close button, which only closes the modal. The dialog uses an auto-save pattern where each field change calls the store setter directly.

---

## API Key Data Flow

### Write path (admin saves settings)
1. Admin opens `SettingsDialog` → configures provider keys → saves
2. Existing Zustand `setProviderConfig` writes to localStorage (unchanged)
3. `syncSettingsToSupabase(category, config)` called from the save handler → calls `POST /api/admin/settings` with the serialized config for that category
4. `/api/admin/settings` verifies admin role → calls `getOrgSettingsClient()` in `lib/org-settings.ts` → runs `pgp_sym_encrypt` SQL → upserts to `org_settings`

### Read path — employee sessions (non-sensitive settings only)
1. `<OrgSettingsHydrator />` is a `'use client'` component rendered in `app/layout.tsx`
2. On mount, calls `GET /api/org-settings/meta` — a server route that returns only non-sensitive settings: provider ID, model ID, voice selection, etc. (no key values)
3. Component calls `useSettingsStore.setState({ providerId, modelId, ... })` to hydrate the store
4. **Key values are never included in this response**

### LLM / API call path (server-side key injection)
- All generation API routes call `getOrgSettings(category)` directly in the route handler
- `getOrgSettings()` uses `lib/supabase/admin.ts` (service role) → runs `pgp_sym_decrypt` SQL → returns parsed config
- Key values injected directly into provider SDK calls
- All seven resolve functions in `lib/server/provider-config.ts` are modified: `resolveApiKey`, `resolveTTSApiKey`, `resolveASRApiKey`, `resolvePDFApiKey`, `resolveImageApiKey`, `resolveVideoApiKey`, `resolveWebSearchApiKey`. For authenticated requests, the `if (clientKey) return clientKey` client-wins branch is removed from all of them. Only the server-fetched org settings key is used.

---

## New API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/admin/settings` | admin | Encrypt + upsert config to `org_settings` |
| `GET` | `/api/admin/users` | admin | List users + invite status |
| `POST` | `/api/admin/users/invite` | admin | Call `supabase.auth.admin.inviteUserByEmail()` |
| `GET` | `/api/admin/library` | admin | List all classrooms |
| `PATCH` | `/api/admin/library/[id]` | admin | Toggle published flag |
| `GET` | `/api/org-settings/meta` | any auth | Return non-sensitive org settings (no key values) |
| `POST` | `/api/auth/webhook` | Supabase sig | Handle invite acceptance, update `accepted_at` |

---

## Employee Experience

- Employees see the same home page and classroom experience as before
- Settings icon is hidden (role-gated)
- A **Library section** on the home page (`components/home/library-section.tsx`) shows admin-published classrooms fetched from `classrooms` table where `published = true`
- Employees can create private classrooms (saved to `classrooms` with `published = false`)
- Employees cannot see other employees' private classrooms (enforced by RLS)

---

## New Files & Changes

### New files
- `middleware.ts` — Supabase `@supabase/ssr` session + role enforcement
- `lib/supabase/client.ts` — browser client (`createBrowserClient` from `@supabase/ssr`)
- `lib/supabase/server.ts` — server client (`createServerClient` with cookie adapter)
- `lib/supabase/admin.ts` — service role client (never imported in client components)
- `lib/org-settings.ts` — `getOrgSettings(category)`, `syncSettingsToSupabase(category, config)`
- `app/login/page.tsx` + `components/auth/login-form.tsx`
- `app/admin/layout.tsx` — admin sidebar nav
- `app/admin/page.tsx` — dashboard with stats + action buttons
- `app/admin/users/page.tsx` + `components/admin/user-table.tsx`
- `app/admin/library/page.tsx` + `components/admin/library-table.tsx`
- `components/admin/stats-cards.tsx`
- `components/org-settings-hydrator.tsx` — `'use client'`, hydrates Zustand with non-sensitive org meta on mount
- `components/home/library-section.tsx` — published classrooms section on home page
- `app/api/admin/settings/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/invite/route.ts`
- `app/api/admin/library/route.ts`
- `app/api/admin/library/[id]/route.ts`
- `app/api/org-settings/meta/route.ts`
- `app/api/auth/webhook/route.ts`
- `supabase/migrations/001_initial_schema.sql` — profiles, org_settings, classrooms, invites tables + RLS + trigger + custom JWT claims function

### Modified files
- `app/layout.tsx` — add `<OrgSettingsHydrator />`
- `components/home/header.tsx` (or equivalent) — gate settings icon to `user_role === 'admin'`
- `lib/store/settings.ts` — call `syncSettingsToSupabase()` in provider config save handlers
- `lib/server/provider-config.ts` — remove client-key-wins branch from `resolveApiKey()` for authenticated requests; fall through to `getOrgSettings()`
- All LLM/TTS/image/video generation API routes — replace `process.env.X_API_KEY` reads with `getOrgSettings()` calls
- `lib/server/classroom-storage.ts` — extend to write new classrooms to Supabase `classrooms` table (old file-based reads kept for backward compatibility)

---

## Environment Variables (New)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, never NEXT_PUBLIC_
ORG_SETTINGS_ENCRYPTION_KEY=        # server-only, used for pgp_sym_encrypt/decrypt
```

---

## Setup Checklist (for implementors)

1. Create Supabase project
2. Run `supabase/migrations/001_initial_schema.sql` — first line is `CREATE EXTENSION IF NOT EXISTS pgcrypto;` (required for `pgp_sym_encrypt`/`pgp_sym_decrypt`)
3. Register `custom_access_token_hook` in Supabase dashboard: Auth → Hooks
4. Disable signups: Supabase dashboard → Auth → Settings → disable "Enable new user signups"
5. Configure Auth webhook: Supabase dashboard → Auth → Webhooks → add `POST /api/auth/webhook` for `signup` event
6. Add env vars to `.env.local`
7. Install `@supabase/ssr`: `pnpm add @supabase/ssr`
8. Create first admin user manually in Supabase Auth dashboard → set `profiles.role = 'admin'`
