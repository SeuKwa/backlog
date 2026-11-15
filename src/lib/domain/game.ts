import type { EffortTag, Game, GameStatus, TimeBudget } from './types';

export const STATUS_LABELS: Record<GameStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  paused: 'En sommeil',
  completed: 'Terminé',
  completed_100: '100 %',
  dropped: 'Abandonné'
};

export const STATUS_ORDER: GameStatus[] = [
  'in_progress',
  'todo',
  'paused',
  'completed',
  'completed_100',
  'dropped'
];

export const ACTIVE_STATUSES: GameStatus[] = ['in_progress', 'todo'];
export const FINISHED_STATUSES: GameStatus[] = ['completed', 'completed_100'];

export const EFFORT_LABELS: Record<EffortTag, string> = {
  calm_exploration: 'Exploration calme',
  action_reflex: 'Action / Réflexes',
  dense_narrative: 'Narration dense',
  mixed: 'Mixte'
};

export const TIME_BUDGET_LABELS: Record<TimeBudget, string> = {
  '<45min': '< 45 min',
  '1-2h': '1–2 h',
  long: 'Session longue'
};

export function isActive(g: Pick<Game, 'status'>): boolean {
  return ACTIVE_STATUSES.includes(g.status);
}

/**
 * Transition de statut : « paused » ne supprime rien (bookmark, jalons et
 * temps de jeu sont conservés) ; les statuts terminés renseignent completedAt.
 */
export function applyStatus(game: Game, to: GameStatus, now = new Date().toISOString()): Game {
  const next: Game = { ...game, status: to, updatedAt: now };
  if (to === 'completed' || to === 'completed_100') next.completedAt = now;
  else delete next.completedAt;
  return next;
}
