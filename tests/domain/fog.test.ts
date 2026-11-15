import { describe, expect, it } from 'vitest';
import { canComplete, maskMilestones, nextMilestone, progressRatio } from '../../src/lib/domain/fog';
import type { Milestone } from '../../src/lib/domain/types';

function m(id: string, order: number, completedAt?: string): Milestone {
  return {
    id,
    gameId: 'g1',
    order,
    label: `Jalon ${order}`,
    hint: `indice ${order}`,
    source: 'manual',
    createdAt: '2025-01-01T00:00:00.000Z',
    completedAt
  };
}

describe('brouillard de guerre (fog.ts)', () => {
  it('masque les jalons futurs : libellé et indice cachés', () => {
    const ms = [m('a', 0, '2025-01-02T00:00:00.000Z'), m('b', 1), m('c', 2)];
    const masked = maskMilestones(ms, true);
    expect(masked[0].label).toBe('Jalon 0');
    expect(masked[0].hint).toBe('indice 0');
    expect(masked[0].state).toBe('done');
    // b est le jalon EN COURS : lisible (passés + en cours visibles)
    expect(masked[1].label).toBe('Jalon 1');
    expect(masked[1].hint).toBe('indice 1');
    expect(masked[1].state).toBe('current');
    // c est futur : masqué
    expect(masked[2].label).toBe('Étape 3 — ???');
    expect(masked[2].hint).toBeUndefined();
    expect(masked[2].state).toBe('locked');
  });

  it('déverrouille le jalon suivant quand tous les précédents sont faits', () => {
    const ms = [m('a', 0, 'x'), m('b', 1, 'x'), m('c', 2)];
    const masked = maskMilestones(ms, true);
    expect(masked[2].state).toBe('current');
    expect(masked[2].label).toBe('Jalon 2');
    expect(masked[2].hint).toBe('indice 2');
  });

  it('désactive le masquage si le brouillard est coupé', () => {
    const ms = [m('a', 0), m('b', 1)];
    const masked = maskMilestones(ms, false);
    expect(masked[1].label).toBe('Jalon 1');
    expect(masked[1].hint).toBe('indice 1');
  });

  it('canComplete refuse tant qu’un jalon précédent est non fait', () => {
    const ms = [m('a', 0), m('b', 1)];
    expect(canComplete(ms[1], ms)).toBe(false);
    expect(canComplete(ms[0], ms)).toBe(true);
  });

  it('progressRatio et nextMilestone', () => {
    const ms = [m('a', 0, 'x'), m('b', 1)];
    expect(progressRatio(ms)).toBe(0.5);
    expect(progressRatio([])).toBe(0);
    expect(nextMilestone(ms)?.id).toBe('b');
    expect(nextMilestone([m('a', 0, 'x')])).toBeUndefined();
  });
});
