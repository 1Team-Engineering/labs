import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgSettings } from '@/lib/org-settings';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [providers, tts, asr, pdf, image, video, webSearch] = await Promise.all([
    getOrgSettings<Record<string, { name?: string; type?: string; models?: unknown[]; defaultBaseUrl?: string; icon?: string; requiresApiKey?: boolean; isBuiltIn?: boolean }>>('providers'),
    getOrgSettings<Record<string, unknown>>('tts'),
    getOrgSettings<Record<string, unknown>>('asr'),
    getOrgSettings<Record<string, unknown>>('pdf'),
    getOrgSettings<Record<string, unknown>>('image'),
    getOrgSettings<Record<string, unknown>>('video'),
    getOrgSettings<Record<string, unknown>>('web-search'),
  ]);

  const safeProviders = providers
    ? Object.fromEntries(
        Object.entries(providers).map(([id, cfg]) => [
          id,
          { ...cfg, apiKey: '', baseUrl: (cfg as { baseUrl?: string }).baseUrl ?? '' },
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
