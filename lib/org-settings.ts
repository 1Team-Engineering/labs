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
