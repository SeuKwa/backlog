import { db } from './db';
import { buildExport, parseBacklogExport } from '$lib/domain/export/json';
import { DEFAULT_SETTINGS, type BacklogExport } from '$lib/domain/types';

export async function exportAll(): Promise<BacklogExport> {
  const [games, milestones, sessions, backtrackNotes, platforms, genres, settings] =
    await Promise.all([
      db.games.toArray(),
      db.milestones.toArray(),
      db.sessions.toArray(),
      db.backtrackNotes.toArray(),
      db.platforms.toArray(),
      db.genres.toArray(),
      db.settings.get('singleton')
    ]);
  return buildExport({
    games,
    milestones,
    sessions,
    backtrackNotes,
    platforms,
    genres,
    settings: settings
      ? {
          fogOfWarEnabled: settings.fogOfWarEnabled,
          showRemainingTime: settings.showRemainingTime,
          exportRespectsFogOfWar: settings.exportRespectsFogOfWar
        }
      : undefined
  });
}

export async function importAll(
  data: unknown,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ games: number }> {
  const parsed = parseBacklogExport(data);
  await db.transaction(
    'rw',
    [db.games, db.milestones, db.sessions, db.backtrackNotes, db.platforms, db.genres, db.settings],
    async () => {
      if (mode === 'replace') {
        await db.games.clear();
        await db.milestones.clear();
        await db.sessions.clear();
        await db.backtrackNotes.clear();
      }
      await db.games.bulkPut(parsed.games);
      await db.milestones.bulkPut(parsed.milestones);
      await db.sessions.bulkPut(parsed.sessions);
      await db.backtrackNotes.bulkPut(parsed.backtrackNotes);
      await db.platforms.bulkPut(parsed.platforms);
      await db.genres.bulkPut(parsed.genres);
      if (parsed.settings) {
        const current = (await db.settings.get('singleton')) ?? DEFAULT_SETTINGS;
        await db.settings.put({ ...current, ...parsed.settings, id: 'singleton' });
      }
    }
  );
  return { games: parsed.games.length };
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
