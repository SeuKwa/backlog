import { liveQuery } from 'dexie';
import { db } from '$lib/storage/db';
import type { GameDetail } from '$lib/services/actions';

export const games$ = liveQuery(async () => db.games.orderBy('updatedAt').reverse().toArray());

export const settings$ = liveQuery(async () => db.settings.get('singleton'));

export const statusCounts$ = liveQuery(async () => {
  const games = await db.games.toArray();
  const counts: Record<string, number> = {};
  for (const g of games) counts[g.status] = (counts[g.status] ?? 0) + 1;
  return counts;
});

export function gameDetail$(id: string) {
  return liveQuery<GameDetail | undefined>(async () => {
    const game = await db.games.get(id);
    if (!game) return undefined;
    const [milestones, sessions] = await Promise.all([
      db.milestones.where('gameId').equals(id).toArray(),
      db.sessions.where('gameId').equals(id).toArray()
    ]);
    return { game, milestones, sessions };
  });
}
