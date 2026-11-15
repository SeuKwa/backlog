import { parsePlayniteCsv, parsePlayniteJson } from '$lib/connectors/playtime/playnite';
import type { PlayniteGame } from '$lib/domain/ports';
import {
  createGame,
  ensureLookup,
  findGameByPlayniteIdOrTitle,
  updateGame
} from '$lib/storage/repositories';
import { db } from '$lib/storage/db';

export async function importPlayniteFile(
  fileName: string,
  text: string
): Promise<{ created: number; updated: number; total: number }> {
  const games: PlayniteGame[] = fileName.toLowerCase().endsWith('.csv')
    ? parsePlayniteCsv(text)
    : parsePlayniteJson(text);
  let created = 0;
  let updated = 0;
  for (const pg of games) {
    const existing = await findGameByPlayniteIdOrTitle(pg.playniteId, pg.name);
    if (existing) {
      const platformIds = await ensureLookup(db.platforms, pg.platforms);
      const genreIds = await ensureLookup(db.genres, pg.genres);
      await updateGame(existing.id, {
        playtimeMinutes: Math.max(existing.playtimeMinutes, pg.playtimeMinutes),
        platformIds: [...new Set([...existing.platformIds, ...platformIds])],
        genreIds: [...new Set([...existing.genreIds, ...genreIds])],
        releaseDate: existing.releaseDate ?? pg.releaseDate,
        externalIds: { ...existing.externalIds, playniteId: pg.playniteId ?? existing.externalIds.playniteId }
      });
      updated++;
    } else {
      const game = await createGame({
        title: pg.name,
        platformNames: pg.platforms,
        genreNames: pg.genres,
        releaseDate: pg.releaseDate
      });
      await updateGame(game.id, {
        playtimeMinutes: pg.playtimeMinutes,
        externalIds: { playniteId: pg.playniteId }
      });
      created++;
    }
  }
  return { created, updated, total: games.length };
}
