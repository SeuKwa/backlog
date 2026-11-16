import type { Game, PlaytimeSettings } from '$lib/domain/types';
import { getGame, getSettings, updateGame } from '$lib/storage/repositories';
import { loadSecret } from '$lib/storage/crypto';
import { steamPlaytime } from '$lib/connectors/playtime/steam';
import { raUserProgress } from '$lib/connectors/playtime/retroachievements';
import { formatMinutes } from '$lib/domain/export/markdown';

export async function syncGamePlaytime(gameId: string): Promise<string> {
  const game = await getGame(gameId);
  if (!game) throw new Error('Jeu introuvable.');
  const settings = await getSettings();
  const p: PlaytimeSettings | undefined = settings.playtime;
  const msgs: string[] = [];

  if (p?.steamApiKeyHandle && p.steamId && game.externalIds.steamAppId) {
    const key = await loadSecret(p.steamApiKeyHandle);
    if (key) {
      const minutes = await steamPlaytime(key, p.steamId, game.externalIds.steamAppId);
      if (minutes != null && minutes > game.playtimeMinutes) {
        await updateGame(gameId, { playtimeMinutes: minutes });
        msgs.push(`Steam : ${formatMinutes(minutes)} au total`);
      } else if (minutes != null) {
        msgs.push(`Steam : ${formatMinutes(minutes)} (déjà à jour localement)`);
      }
    }
  }

  if (p?.raUsername && p.raApiKeyHandle && game.externalIds.retroachievementsId) {
    const key = await loadSecret(p.raApiKeyHandle);
    if (key) {
      const prog = await raUserProgress(p.raUsername, key, game.externalIds.retroachievementsId);
      if (prog && prog.total > 0) {
        await updateGame(gameId, {
          raProgress: { earned: prog.earned, total: prog.total, updatedAt: new Date().toISOString() }
        });
        msgs.push(`RetroAchievements : ${prog.earned}/${prog.total} succès`);
      }
    }
  }

  if (msgs.length === 0) {
    throw new Error(
      'Rien à synchroniser : liez un appid Steam / un id RA sur la fiche et configurez les clés (Paramètres).'
    );
  }
  return msgs.join(' · ');
}

export async function canSync(game: Game, settingsPlaytime?: PlaytimeSettings): Promise<boolean> {
  const p = settingsPlaytime ?? (await getSettings()).playtime;
  return !!(
    (p?.steamApiKeyHandle && p.steamId && game.externalIds.steamAppId) ||
    (p?.raUsername && p.raApiKeyHandle && game.externalIds.retroachievementsId)
  );
}
