import { describe, expect, it } from 'vitest';
import { remainingHours } from '../../src/lib/domain/estimates';
import type { Milestone } from '../../src/lib/domain/types';

function m(id: string, order: number, done = false): Milestone {
  return {
    id,
    gameId: 'g1',
    order,
    label: id,
    source: 'manual',
    createdAt: '2025-01-01T00:00:00.000Z',
    completedAt: done ? '2025-01-02T00:00:00.000Z' : undefined
  };
}

describe('estimation du temps restant', () => {
  it('retourne null sans jalons', () => {
    expect(remainingHours({ playtimeMinutes: 100, hltb: { mainHours: 10 } }, [])).toBeNull();
  });

  it('retourne 0 quand tout est terminé', () => {
    const ms = [m('a', 0, true), m('b', 1, true)];
    expect(remainingHours({ playtimeMinutes: 600 }, ms)).toBe(0);
  });

  it('prend le min entre rythme observé et HLTB, arrondi au quart d’heure', () => {
    // 4 jalons, 2 faits, 600 min jouées -> rythme 300 min/jalon -> 2 restants = 600 min = 10 h
    // hltb 20 h, ratio 0.5 -> 10 h aussi ; min = 10
    const ms = [m('a', 0, true), m('b', 1, true), m('c', 2), m('d', 3)];
    expect(remainingHours({ playtimeMinutes: 600, hltb: { mainHours: 20 } }, ms)).toBe(10);
    // hltb plus pessimiste : 8 h restantes via ratio -> min(10, 8) = 8
    expect(remainingHours({ playtimeMinutes: 600, hltb: { mainHours: 16 } }, ms)).toBe(8);
  });

  it('fonctionne avec un seul jalon fait et aucun HLTB', () => {
    const ms = [m('a', 0, true), m('b', 1), m('c', 2), m('d', 3)];
    // 120 min pour 1 jalon -> 120 min/jalon -> 3 restants = 360 min = 6 h
    expect(remainingHours({ playtimeMinutes: 120 }, ms)).toBe(6);
  });

  it('retourne null si aucune méthode ne s’applique (0 jalon fait, pas de HLTB)', () => {
    const ms = [m('a', 0), m('b', 1)];
    expect(remainingHours({ playtimeMinutes: 0 }, ms)).toBeNull();
  });
});
