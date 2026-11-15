import { db } from './db';

export async function saveCoverFromUrl(gameId: string, remoteUrl: string): Promise<string> {
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`Jaquette : HTTP ${res.status}`);
  const blob = await res.blob();
  await db.covers.put({ id: gameId, blob });
  return URL.createObjectURL(blob);
}

export async function rehydrateCovers(): Promise<void> {
  const games = await db.games.toArray();
  for (const g of games) {
    const rec = await db.covers.get(g.id);
    if (rec && (!g.coverUrl || g.coverUrl.startsWith('blob:'))) {
      await db.games.update(g.id, { coverUrl: URL.createObjectURL(rec.blob) });
    }
  }
}
