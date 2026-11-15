import { describe, expect, it } from 'vitest';
import { buildExport, parseBacklogExport } from '../../src/lib/domain/export/json';

const valid = buildExport({
  games: [
    {
      id: 'g1',
      title: 'Celeste',
      platformIds: ['switch'],
      genreIds: ['platformer'],
      status: 'todo',
      effort: 'action_reflex',
      moodTags: [],
      externalIds: {},
      playtimeMinutes: 0,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    }
  ],
  milestones: [],
  sessions: [],
  backtrackNotes: [],
  platforms: [{ id: 'switch', name: 'Switch' }],
  genres: [{ id: 'platformer', name: 'Platformer' }]
});

describe('export/import JSON', () => {
  it('valide un export généré par buildExport', () => {
    const parsed = parseBacklogExport(JSON.parse(JSON.stringify(valid)));
    expect(parsed.format).toBe('gamevault-backlog');
    expect(parsed.games[0].title).toBe('Celeste');
    expect(parsed.games[0].platformIds).toEqual(['switch']);
  });

  it('rejette un format inconnu', () => {
    expect(() => parseBacklogExport({ format: 'autre', version: 1 })).toThrow(/Export invalide/);
  });

  it('rejette un statut invalide', () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.games[0].status = 'en_cours_v2';
    expect(() => parseBacklogExport(bad)).toThrow(/Export invalide/);
  });
});
