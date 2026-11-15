import type { Game, Milestone } from './types';
import { progressRatio } from './fog';

/**
 * Estimation des heures restantes, croisant deux méthodes :
 * - rythme observé : playtime / jalons faits × jalons restants ;
 * - durée de référence (HLTB histoire principale) × (1 − progression).
 * On retient le minimum des deux, arrondi au quart d'heure.
 * Affichée uniquement si l'utilisateur active l'option (showRemainingTime).
 */
export function remainingHours(
  game: Pick<Game, 'playtimeMinutes' | 'hltb'>,
  milestones: Milestone[]
): number | null {
  const total = milestones.length;
  if (total === 0) return null;
  const done = milestones.filter((m) => !!m.completedAt).length;
  const remaining = total - done;
  if (remaining === 0) return 0;
  const ratio = progressRatio(milestones);
  const paceBased = done > 0 ? ((game.playtimeMinutes / done) * remaining) / 60 : null;
  const hltbBased =
    game.hltb?.mainHours != null ? game.hltb.mainHours * (1 - ratio) : null;
  const candidates = [paceBased, hltbBased].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  );
  if (candidates.length === 0) return null;
  return Math.round(Math.min(...candidates) * 4) / 4;
}
