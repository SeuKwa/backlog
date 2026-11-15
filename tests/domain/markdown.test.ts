import { describe, expect, it } from 'vitest';
import { formatMinutes, gameToMarkdown } from '../../src/lib/domain/export/markdown';
import type { Game, Milestone } from '../../src/lib/domain/types';

function game(): Game {
  return {
    id: 'g1',
    title: 'Hollow Knight',
    platformIds: ['pc'],
    genreIds: ['metroidvania'],
    releaseDate: '2017-02-24',
    status: 'in_progress',
    effort: 'action_reflex',
    moodTags: [],
    personalNotes: 'Ne pas oublier le boss du fond.',
    bookmark: 'Récupérer la clé dans la zone Est',
    externalIds: {},
    playtimeMinutes: 754,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };
}

function m(id: string, order: number, done: boolean, label = `Étape ${order + 1}`, hint?: string): Milestone {
  return {
    id,
    gameId: 'g1',
    order,
    label,
    hint,
    source: 'manual',
    createdAt: '2025-01-01T00:00:00.000Z',
    completedAt: done ? '2025-01-02T00:00:00.000Z' : undefined
  };
}

describe('export Markdown anti-spoiler', () => {
  it('masque par défaut les jalons verrouillés (pas de libellé ni d’indice)', () => {
    const ms = [
      m('a', 0, true, 'Étape 1', 'Premier donjon'),
      m('b', 1, false, 'Étape 2', 'Boss du chapitre 3 : MachinTruc'),
      m('c', 2, false, 'Étape 3', 'Fin secrète révélée')
    ];
    const md = gameToMarkdown(game(), ms, { respectFog: true });
    expect(md).toContain('- [x] Étape 1 — Premier donjon');
    // le jalon EN COURS est lisible (passés + en cours), les suivants sont masqués
    expect(md).toContain('- [>] Étape 2 — Boss du chapitre 3 : MachinTruc');
    expect(md).toContain('- [ ] Étape 3 — ???');
    expect(md).not.toContain('Fin secrète révélée');
    expect(md).toContain('Récupérer la clé dans la zone Est');
  });

  it('révèle tout si respectFog est désactivé', () => {
    const ms = [m('a', 0, false, 'Étape 1', 'Indice fort')];
    const md = gameToMarkdown(game(), ms, { respectFog: false });
    expect(md).toContain('Indice fort');
  });

  it('formatMinutes', () => {
    expect(formatMinutes(30)).toBe('30 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(754)).toBe('12 h 34 min');
  });
});
