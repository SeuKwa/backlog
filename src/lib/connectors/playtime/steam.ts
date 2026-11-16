export function parseOwnedGames(json: unknown, appid: number): number | null {
  const games = (json as { response?: { games?: { appid: number; playtime_forever?: number }[] } })
    ?.response?.games;
  if (!Array.isArray(games)) return null;
  const g = games.find((x) => x.appid === appid);
  return g?.playtime_forever != null ? Math.round(g.playtime_forever) : null;
}

export function findAppIdByName(json: unknown, name: string): number | null {
  const games = (json as { response?: { games?: { appid: number; name?: string }[] } })?.response
    ?.games;
  if (!Array.isArray(games)) return null;
  const norm = name.trim().toLowerCase();
  const g = games.find((x) => (x.name ?? '').trim().toLowerCase() === norm);
  return g?.appid ?? null;
}

async function ownedGames(apiKey: string, steamId: string): Promise<unknown> {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${encodeURIComponent(
    apiKey
  )}&steamid=${encodeURIComponent(steamId)}&include_appinfo=1&include_played_free_games=1&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam Web API : HTTP ${res.status}`);
  return res.json();
}

export async function steamPlaytime(
  apiKey: string,
  steamId: string,
  appid: number
): Promise<number | null> {
  return parseOwnedGames(await ownedGames(apiKey, steamId), appid);
}

export async function steamFindAppId(
  apiKey: string,
  steamId: string,
  name: string
): Promise<number | null> {
  return findAppIdByName(await ownedGames(apiKey, steamId), name);
}
