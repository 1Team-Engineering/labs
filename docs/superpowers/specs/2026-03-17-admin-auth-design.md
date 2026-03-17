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
- Admins configure shared API keys via the existing `SettingsDialog` (no new UI)
- Employees use admin-configured keys transparently (keys never exposed client-side)
- Employees can create private classrooms and take classrooms from a shared library
- Only admins can publish classrooms to the shared library
- Admin role is assigned manually in the Supabase dashboard

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

### `org_settings`
One row per provider key. Admin-only read/write via RLS.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `provider` | `text` | e.g. `'openai'`, `'anthropic'` |
| `key_name` | `text` | e.g. `'OPENAI_API_KEY'` |
| `key_value` | `bytea` | Encrypted via `pgcrypto` |
| `updated_by` | `uuid` | FK → `profiles.id` |
| `updated_at` | `timestamptz` | |

### `classrooms`
Stores classroom metadata and content. Existing generation output.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `title` | `text` | |
| `created_by` | `uuid` | FK → `profiles.id` |
| `published` | `bool` | DEFAULT `false` |
| `published_by` | `uuid` | FK → `profiles.id`, nullable |
| `created_at` | `timestamptz` | |
| `data` | `jsonb` | Full classroom JSON |

### `invites`
Tracks pending and accepted email invitations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `email` | `text` | |
| `invited_by` | `uuid` | FK → `profiles.id` |
| `accepted_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | |

### RLS Policies

- **`profiles`**: employees can SELECT their own row; admins can SELECT all
- **`org_settings`**: admin-only SELECT/INSERT/UPDATE; no employee access
- **`classrooms`**: employees can SELECT/INSERT/UPDATE their own rows + all published rows; admins can SELECT/UPDATE all; only admins can set `published = true`
- **`invites`**: admin-only INSERT; employees cannot access

---

## Authentication & Routing

### Login Flow
- Single `/login` page: email + password via Supabase Auth
- No self-registration; all accounts are created via admin invite
- After login, redirect to `/` (employee) or `/admin` (admin)

### Invite Flow
1. Admin visits `/admin/users` → enters employee email → clicks "Invite"
2. App calls `supabase.auth.admin.inviteUserByEmail()`
3. Employee receives Supabase magic-link email → sets password → profile auto-created with `role = 'employee'`
4. Invite row updated with `accepted_at`

### Middleware (`middleware.ts`)
All routes protected. Role embedded in Supabase session JWT via custom claims.

| Path | Rule |
|------|------|
| `/login` | Public |
| `/` | Requires auth (any role) |
| `/classroom/*` | Requires auth (any role) |
| `/admin/*` | Requires auth + `role = 'admin'`; employees → redirect `/` |

### Admin Role Assignment
Set manually in the Supabase dashboard by updating `profiles.role = 'admin'`. No UI needed.

---

## Admin Interface

### `/admin` — Dashboard
- Stats: user count, classroom count, last key rotation timestamp
- Action buttons:
  - **Platform Settings** → opens existing `<SettingsDialog />` (admin-only)
  - **Manage Users** → links to `/admin/users`
  - **Content Library** → links to `/admin/library`

### `/admin/users` — User Management
- Table: email, name, role, status (pending invite / active)
- "Invite Employee" button → email input form
- No password management (Supabase handles reset flows)

### `/admin/library` — Content Library
- Table: all classrooms across all users with title, creator, created date, published status
- Toggle `published` to add/remove from the shared employee library

### Settings Access
- The existing `<SettingsDialog />` is reused without modification
- The settings icon in the home page header is shown only to admins
- The "Platform Settings" button on the admin dashboard also opens it

---

## API Key Data Flow

### Write path (admin saves settings)
1. Admin opens `SettingsDialog` → configures provider keys → saves
2. Existing Zustand store writes to localStorage (unchanged behavior)
3. New `syncSettingsToSupabase()` fires in background → encrypts key values via `pgcrypto` → upserts to `org_settings`

### Read path (all users on page load)
1. Server component `<SettingsHydrator />` runs on page load
2. Calls `getOrgSettings()` server-side → decrypts keys from `org_settings`
3. Hydrates Zustand initial state with non-sensitive settings (provider selection, model, voice, etc.)
4. **Key values never sent to the browser for employees**

### LLM/API call path
- All generation calls go through Next.js API routes (existing behavior)
- API routes call `getOrgSettings()` server-side to retrieve decrypted keys
- Keys injected directly into provider SDK calls
- Employees' localStorage settings control provider/model selection only; keys come from server

---

## New API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/admin/settings` | admin | Write encrypted keys to `org_settings` |
| `GET` | `/api/admin/users` | admin | List users + invite status |
| `POST` | `/api/admin/users/invite` | admin | Trigger Supabase invite email |
| `GET` | `/api/admin/library` | admin | List all classrooms |
| `PATCH` | `/api/admin/library/[id]` | admin | Toggle published flag |

---

## Employee Experience

- Employees see the same home page and classroom experience as before
- Settings icon is hidden
- A "Library" section appears on the home page showing admin-published classrooms
- Employees can create private classrooms (saved to `classrooms` table with `published = false`)
- Employees cannot see other employees' private classrooms

---

## New Files & Changes

### New files
- `middleware.ts` — Supabase session + role enforcement
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server Supabase client
- `lib/supabase/admin.ts` — admin SDK client (service role key)
- `lib/org-settings.ts` — `getOrgSettings()`, `syncSettingsToSupabase()`
- `app/login/page.tsx` — login page
- `app/admin/page.tsx` — admin dashboard
- `app/admin/users/page.tsx` — user management
- `app/admin/library/page.tsx` — content library
- `app/admin/layout.tsx` — admin layout with sidebar nav
- `components/auth/login-form.tsx`
- `components/admin/stats-cards.tsx`
- `components/admin/user-table.tsx`
- `components/admin/library-table.tsx`
- `components/settings-hydrator.tsx` — server component, hydrates Zustand from org_settings
- `supabase/migrations/001_initial_schema.sql`

### Modified files
- `app/layout.tsx` — wrap with `<SettingsHydrator />`
- `components/home/header.tsx` (or wherever settings icon lives) — gate to admin role
- `lib/store/settings.ts` — add `syncToSupabase` side effect on save
- All LLM API routes — replace direct env var reads with `getOrgSettings()`

---

## Security Notes

- `pgcrypto` used for symmetric encryption of key values at rest
- Encryption key stored in Supabase Vault or as a server-only env var (`ORG_SETTINGS_ENCRYPTION_KEY`)
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) used only in server-side admin client, never exposed to browser
- RLS is the primary access control layer; API route role checks are a secondary defense
- Invite-only signup: `SUPABASE_AUTH_DISABLE_SIGNUP=true` in Supabase project settings
