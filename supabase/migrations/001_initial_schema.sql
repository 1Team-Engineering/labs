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
  category   text NOT NULL UNIQUE,
  config_json bytea,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "classrooms_select_employee" ON public.classrooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR published = true
  );

CREATE POLICY "classrooms_insert_own" ON public.classrooms
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND published = false
  );

CREATE POLICY "classrooms_update_own" ON public.classrooms
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid() AND published = false
  );

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
