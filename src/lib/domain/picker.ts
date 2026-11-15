import type { EffortTag, Game, Milestone, TimeBudget } from './types';
import { remainingHours } from './estimates';
import { isActive } from './game';

export interface PickerCriteria {
  budget: TimeBudget;
  effort: EffortTag | 'any';
}

const BUDGET_HOURS: Record<TimeBudget, number> = {
  '<45min': 0.75,
  '1-2h': 2,
  long: Number.POSITIVE_INFINITY
};

/**
 * Sélecteur « À quoi je joue ce soir ? » : ne pioche que dans les jeux
 * actifs (en cours / à faire), filtrés par effort mental souhaité et, si
 * une estimation est disponible, par budget de temps.
 */
export function pickCandidates(
  games: Game[],
  criteria: PickerCriteria,
  milestonesByGame?: Map<string, Milestone[]>
): Game[] {
  const limit = BUDGET_HOURS[criteria.budget];
  return games.filter((g) => {
    if (!isActive(g)) return false;
    if (criteria.effort !== 'any' && g.effort !== criteria.effort) return false;
    if (milestonesByGame) {
      const est = remainingHours(g, milestonesByGame.get(g.id) ?? []);
      if (est != null && est > limit) return false;
    }
    return true;
  });
}

export function pickRandom<T>(items: T[], rand: () => number = Math.random): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rand() * items.length)];
}
