import {
  addSession,
  changeStatus,
  completeMilestone,
  getGame,
  listMilestones,
  listSessions,
  updateGame
} from '$lib/storage/repositories';
import { sortedMilestones } from '$lib/domain/fog';
import type { Game, GameStatus, Milestone, PlaySession } from '$lib/domain/types';

export interface GameDetail {
  game: Game;
  milestones: Milestone[];
  sessions: PlaySession[];
}

export async function gameWithRelations(id: string): Promise<GameDetail | undefined> {
  const game = await getGame(id);
  if (!game) return undefined;
  const [milestones, sessions] = await Promise.all([listMilestones(id), listSessions(id)]);
  return { game, milestones, sessions };
}

export async function quickCheckin(gameId: string, minutes: 30 | 60): Promise<void> {
  await addSession(gameId, minutes, 'quick_checkin');
}

export async function currentMilestone(gameId: string): Promise<Milestone | undefined> {
  const ms = await listMilestones(gameId);
  return sortedMilestones(ms).find((m) => !m.completedAt);
}

export async function validateCurrentMilestone(gameId: string): Promise<void> {
  const current = await currentMilestone(gameId);
  if (!current) throw new Error('Aucun jalon en cours à valider.');
  await completeMilestone(current.id);
}

export async function setBookmark(gameId: string, text: string): Promise<void> {
  await updateGame(gameId, { bookmark: text.trim() || undefined });
}

export async function setStatus(gameId: string, to: GameStatus): Promise<void> {
  await changeStatus(gameId, to);
}
