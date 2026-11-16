import { describe, expect, it } from 'vitest';
import { computeStats } from '../../src/lib/domain/stats';
import type { Game, Genre, Milestone, Platform, PlaySession } from '../../src/lib/domain/types';

function game(id: string, status: Game['status'], minutes: number, genreIds: string[] = [], platformIds: string[] = []): Game {
  return {
    id,
    title: `Jeu ${id}`,
    platformIds,
    genreIds,
    status,
    effort: 'mixed',
    moodTags: [],
    externalIds: {},
    playtimeMinutes: minutes,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };
}

function session(gameId: string, minutes: number, createdAt: string): PlaySession {
  return { id: `s-${gameId}-${createdAt}`, gameId, durationMinutes: minutes, kind: 'quick_checkin', createdAt };
}

describe('computeStats', () => {
  const games = [
    game('a', 'in_progress', 600, ['rpg'], ['pc']),
    game('b', 'completed', 1200, ['rpg', 'action'], ['switch']),
    game('c', 'todo', 0, [], [])
  ];
  const sessions = [
    session('a', 60, '2025-01-15T20:00:00.000Z'),
    session('a', 30, '2025-01-20T20:00:00.000Z'),
    session('b', 120, '2025-02-01T20:00:00.000Z')
  ];
  const milestones: Milestone[] = [
    { id: 'm1', gameId: 'a', order: 0, label: 'Étape 1', source: 'manual', createdAt: '2025-01-01T00:00:00.000Z', completedAt: '2025-01-02T00:00:00.000Z' },
    { id: 'm2', gameId: 'a', order: 1, label: 'Étape 2', source: 'manual', createdAt: '2025-01-01T00:00:00.000Z' }
  ];
  const genres: Genre[] = [
    { id: 'rpg', name: 'RPG' },
    { id: 'action', name: 'Action' }
  ];
  const platforms: Platform[] = [
    { id: 'pc', name: 'PC' },
    { id: 'switch', name: 'Switch' }
  ];

  const stats = computeStats({ games, sessions, milestones, genres, platforms });

  it('totaux généraux', () => {
    expect(stats.gamesCount).toBe(3);
    expect(stats.totalMinutes).toBe(1800);
    expect(stats.activeCount).toBe(2);
    expect(stats.finishedCount).toBe(1);
    expect(stats.milestonesDone).toBe(1);
    expect(stats.avgSessionMinutes).toBe(600);
  });

  it('temps par mois depuis les sessions', () => {
    expect(stats.byMonth).toEqual([
      { month: '2025-01', minutes: 90 },
      { month: '2025-02', minutes: 120 }
    ]);
  });

  it('répartition par genre (split entre genres du jeu)', () => {
    const rpg = stats.byGenre.find((g) => g.name === 'RPG');
    const action = stats.byGenre.find((g) => g.name === 'Action');
    expect(rpg?.minutes).toBe(600 + 600);
    expect(action?.minutes).toBe(600);
  });

  it('répartition par plateforme + statut', () => {
    expect(stats.byPlatform.find((p) => p.name === 'PC')?.minutes).toBe(600);
    expect(stats.byPlatform.find((p) => p.name === 'Switch')?.minutes).toBe(1200);
    expect(stats.byStatus).toEqual({ in_progress: 1, completed: 1, todo: 1 });
  });

  it('cas vide', () => {
    const empty = computeStats({ games: [], sessions: [], milestones: [], genres: [], platforms: [] });
    expect(empty.gamesCount).toBe(0);
    expect(empty.totalMinutes).toBe(0);
    expect(empty.avgSessionMinutes).toBe(0);
    expect(empty.byMonth).toEqual([]);
  });
});
