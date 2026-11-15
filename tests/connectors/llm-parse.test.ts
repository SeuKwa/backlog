import { describe, expect, it } from 'vitest';
import { parseLlmMilestones } from '../../src/lib/connectors/llm/parse';
import { buildMilestoneUserPrompt } from '../../src/lib/connectors/llm/prompts';

describe('parseLlmMilestones', () => {
  it('parse une réponse JSON valide', () => {
    const text = JSON.stringify({
      milestones: [
        { label: 'Étape 1', hint: 'Explorer la première zone' },
        { label: 'Étape 2' }
      ]
    });
    const drafts = parseLlmMilestones(text);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toEqual({ label: 'Étape 1', hint: 'Explorer la première zone' });
    expect(drafts[1].hint).toBeUndefined();
  });

  it('rejette du non-JSON', () => {
    expect(() => parseLlmMilestones('Voici les jalons : ...')).toThrow(/JSON/);
  });

  it('rejette un JSON sans tableau milestones', () => {
    expect(() => parseLlmMilestones('{"etapes": []}')).toThrow(/invalide/);
  });

  it('rejette plus de 20 jalons', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ label: `Étape ${i}` }));
    expect(() => parseLlmMilestones(JSON.stringify({ milestones: many }))).toThrow(/invalide/);
  });
});

describe('buildMilestoneUserPrompt', () => {
  it('demande la suite de la numérotation si des jalons existent', () => {
    expect(buildMilestoneUserPrompt('Hollow Knight', 3)).toContain('Étape 4');
    expect(buildMilestoneUserPrompt('Hollow Knight', 0)).toContain('Étape 1');
  });
});
