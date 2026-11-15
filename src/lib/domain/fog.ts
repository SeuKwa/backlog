import type { Milestone, MilestoneState } from './types';

export function sortedMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.order - b.order);
}

/**
 * État dérivé d'un jalon : un jalon est « current » si tous ceux qui le
 * précèdent sont terminés, « done » s'il a completedAt, sinon « locked ».
 */
export function milestoneState(m: Milestone, sorted: Milestone[]): MilestoneState {
  if (m.completedAt) return 'done';
  const idx = sorted.findIndex((x) => x.id === m.id);
  const allPreviousDone = sorted.slice(0, idx).every((x) => !!x.completedAt);
  return allPreviousDone ? 'current' : 'locked';
}

export interface MaskedMilestone {
  id: string;
  gameId: string;
  order: number;
  state: MilestoneState;
  label: string;
  hint?: string;
  source: Milestone['source'];
  completedAt?: string;
}

/**
 * Brouillard de guerre : un jalon verrouillé ne révèle que « Étape X — ??? »,
 * jamais son libellé ni son indice. Appliqué au rendu ET à l'export Markdown.
 */
export function maskMilestones(milestones: Milestone[], enabled = true): MaskedMilestone[] {
  const sorted = sortedMilestones(milestones);
  return sorted.map((m) => {
    const state = milestoneState(m, sorted);
    const locked = enabled && state === 'locked';
    return {
      id: m.id,
      gameId: m.gameId,
      order: m.order,
      state,
      source: m.source,
      completedAt: m.completedAt,
      label: locked ? `Étape ${m.order + 1} — ???` : m.label,
      hint: locked ? undefined : m.hint
    };
  });
}

export function nextMilestone(milestones: Milestone[]): Milestone | undefined {
  return sortedMilestones(milestones).find((m) => !m.completedAt);
}

export function canComplete(milestone: Milestone, milestones: Milestone[]): boolean {
  const sorted = sortedMilestones(milestones);
  const idx = sorted.findIndex((x) => x.id === milestone.id);
  return sorted.slice(0, idx).every((x) => !!x.completedAt);
}

export function progressRatio(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  return milestones.filter((m) => !!m.completedAt).length / milestones.length;
}
