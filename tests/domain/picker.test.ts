import { describe, expect, it } from 'vitest';
import { pickCandidates, pickRandom } from '../../src/lib/domain/picker';
import type { Game, Milestone } from '../../src/lib/domain/types';

function game(id: string, status: Game['status'], effort: Game['effort'], playtimeMinutes = 0): Game {
  return {
    id,
    title: `Jeu ${id}`,
    platformIds: [],
    genreIds: [],
    status,
    effort,
    moodTags: [],
    externalIds: {},
    playtimeMinutes,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };
}

function m(id: string, gameId: string, order: number, done: boolean): Milestone {
  return {
    id,
    gameId,
    order,
    label: id,
    source: 'manual',
    createdAt: '2025-01-01T00:00:00.000Z',
    completedAt: done ? '2025-01-02T00:00:00.000Z' : undefined
  };
}

describe('sélecteur du soir', () => {
  const games = [
    game('a', 'in_progress', 'calm_exploration', 600),
    game('b', 'todo', 'action_reflex'),
    game('c', 'paused', 'dense_narrative'),
    game('d', 'completed', 'mixed'),
    game('e', 'in_progress', 'dense_narrative', 60)
  ];

  it('ne garde que les jeux actifs', () => {
    const c = pickCandidates(games, { budget: 'long', effort: 'any' });
    expect(c.map((g) => g.id).sort()).toEqual(['a', 'b', 'e']);
  });

  it('filtre par effort', () => {
    const c = pickCandidates(games, { budget: 'long', effort: 'dense_narrative' });
    expect(c.map((g) => g.id)).toEqual(['e']);
  });

  it('exclut les jeux dont l’estimation dépasse le budget', () => {
    const byGame = new Map<string, Milestone[]>([
      ['a', [m('a1', 'a', 0, true), m('a2', 'a', 1, false), m('a3', 'a', 2, false)]]
    ]);
    // a : 600 min pour 1 jalon -> 2 restants = 1200 min = 20 h > 0.75 h
    const c = pickCandidates(games, { budget: '<45min', effort: 'any' }, byGame);
    expect(c.map((g) => g.id)).not.toContain('a');
    expect(c.map((g) => g.id)).toEqual(['b', 'e']);
  });

  it('pickRandom est déterministe avec un rand contrôlé', () => {
    expect(pickRandom([1, 2, 3], () => 0.99)).toBe(3);
    expect(pickRandom([])).toBeUndefined();
  });
});
