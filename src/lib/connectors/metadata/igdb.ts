import type { AppSettings, GameDraft } from '$lib/domain/ports';
import { loadSecret } from '$lib/storage/crypto';

let cachedToken: { token: string; expiresAt: number } | undefined;

async function getToken(settings: AppSettings): Promise<{ token: string; clientId: string }> {
  const md = settings.metadata;
  if (!md?.clientIdHandle || !md.clientSecretHandle) {
    throw new Error('IGDB : client id / client secret non configurés (Paramètres).');
  }
  const clientId = await loadSecret(md.clientIdHandle);
  const secret = await loadSecret(md.clientSecretHandle);
  if (!clientId || !secret) throw new Error('IGDB : identifiants introuvables.');
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return { token: cachedToken.token, clientId };
  }
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      grant_type: 'client_credentials'
    })
  });
  if (!res.ok) throw new Error(`Twitch OAuth : HTTP ${res.status}`);
  const json = await res.json();
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + Math.max(60, (json.expires_in ?? 3600) - 60) * 1000
  };
  return { token: json.access_token, clientId };
}

const FIELDS =
  'fields name, first_release_date, cover.image_id, platforms.name, genres.name, external_games.category, external_games.uid;';

export function extractSteamAppId(row: Record<string, unknown>): number | undefined {
  const ext = (row.external_games as { category: number; uid: number | string }[] | undefined) ?? [];
  const steam = ext.find((e) => e.category === 1);
  return steam ? Number(steam.uid) : undefined;
}

async function apiGames(settings: AppSettings, query: string): Promise<Record<string, unknown>[]> {
  const { token, clientId } = await getToken(settings);
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: query
  });
  if (!res.ok) throw new Error(`IGDB : HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>[];
}

function rowToDraft(row: Record<string, unknown>): GameDraft {
  const cover = row.cover as { image_id?: string } | undefined;
  const firstRelease = typeof row.first_release_date === 'number' ? row.first_release_date : undefined;
  const externalIds: GameDraft['externalIds'] = { igdb: Number(row.id) };
  const steamAppId = extractSteamAppId(row);
  if (steamAppId != null) externalIds.steamAppId = steamAppId;
  return {
    title: String(row.name ?? ''),
    releaseDate: firstRelease ? new Date(firstRelease * 1000).toISOString().slice(0, 10) : undefined,
    platforms: ((row.platforms as { name: string }[] | undefined) ?? []).map((p) => p.name),
    genres: ((row.genres as { name: string }[] | undefined) ?? []).map((g) => g.name),
    coverRemoteUrl: cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`
      : undefined,
    externalIds
  };
}

export async function igdbSearch(settings: AppSettings, query: string): Promise<GameDraft[]> {
  const safe = query.replace(/"/g, ' ').trim();
  const rows = await apiGames(
    settings,
    `search "${safe}"; ${FIELDS} limit 10;`
  );
  return rows.filter((r) => r.name).map(rowToDraft);
}

export async function igdbDetails(settings: AppSettings, id: number): Promise<GameDraft | undefined> {
  const rows = await apiGames(settings, `${FIELDS} where id = ${id};`);
  return rows[0] ? rowToDraft(rows[0]) : undefined;
}
