import { describe, expect, it } from 'vitest';
import { applyStatus, isActive } from '../../src/lib/domain/game';
import type { Game } from '../../src/lib/domain/types';

function game(status: Game['status']): Game {
  return {
    id: 'g1',
    title: 'Test',
    platformIds: [],
    genreIds: [],
    status,
    effort: 'mixed',
    moodTags: [],
    externalIds: {},
    playtimeMinutes: 60,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };
}

describe('transitions de statut', () => {
  it('completed renseigne completedAt', () => {
    const g = applyStatus(game('in_progress'), 'completed', '2025-02-01T00:00:00.000Z');
    expect(g.status).toBe('completed');
    expect(g.completedAt).toBe('2025-02-01T00:00:00.000Z');
  });

  it('quitter un statut terminé efface completedAt (ex. reprise après 100 %)', () => {
    const done = applyStatus(game('completed'), 'in_progress', '2025-02-02T00:00:00.000Z');
    expect(done.completedAt).toBeUndefined();
  });

  it('paused conserve les données (bookmark, temps)', () => {
    const g = { ...game('in_progress'), bookmark: 'objectif X', playtimeMinutes: 120 };
    const paused = applyStatus(g, 'paused');
    expect(paused.bookmark).toBe('objectif X');
    expect(paused.playtimeMinutes).toBe(120);
    expect(isActive(paused)).toBe(false);
    expect(isActive(game('todo'))).toBe(true);
  });
});
