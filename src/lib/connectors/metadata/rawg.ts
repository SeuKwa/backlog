import type { AppSettings, GameDraft } from '$lib/domain/ports';
import { loadSecret } from '$lib/storage/crypto';

async function getKey(settings: AppSettings): Promise<string> {
  const handle = settings.metadata?.apiKeyHandle;
  if (!handle) throw new Error('RAWG : clé API non configurée (Paramètres).');
  const key = await loadSecret(handle);
  if (!key) throw new Error('RAWG : clé introuvable.');
  return key;
}

async function apiGet(settings: AppSettings, path: string): Promise<Record<string, unknown>> {
  const key = await getKey(settings);
  const url = new URL(`https://api.rawg.io/api${path}`);
  url.searchParams.set('key', key);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`RAWG : HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

function rowToDraft(row: Record<string, unknown>): GameDraft {
  return {
    title: String(row.name ?? ''),
    releaseDate: typeof row.released === 'string' ? row.released : undefined,
    platforms: ((row.platforms as { platform: { name: string } }[] | undefined) ?? []).map(
      (p) => p.platform.name
    ),
    genres: ((row.genres as { name: string }[] | undefined) ?? []).map((g) => g.name),
    coverRemoteUrl: typeof row.background_image === 'string' ? row.background_image : undefined,
    externalIds: { rawg: Number(row.id) }
  };
}

export async function rawgSearch(settings: AppSettings, query: string): Promise<GameDraft[]> {
  const json = await apiGet(settings, `/games?search=${encodeURIComponent(query)}&page_size=10`);
  const results = (json.results as Record<string, unknown>[] | undefined) ?? [];
  return results.filter((r) => r.name).map(rowToDraft);
}

export async function rawgDetails(settings: AppSettings, id: number): Promise<GameDraft | undefined> {
  const json = await apiGet(settings, `/games/${id}`);
  return json.name ? rowToDraft(json) : undefined;
}
