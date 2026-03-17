'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings';

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
