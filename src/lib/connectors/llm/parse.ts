import { z } from 'zod';

export interface MilestoneDraft {
  label: string;
  hint?: string;
}

const milestoneDraftSchema = z.object({
  label: z.string().min(1).max(120),
  hint: z.string().max(300).optional()
});

const responseSchema = z.object({
  milestones: z.array(milestoneDraftSchema).min(1).max(20)
});

export function parseLlmMilestones(text: string): MilestoneDraft[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('La réponse du LLM n’est pas du JSON valide.');
  }
  const res = responseSchema.safeParse(json);
  if (!res.success) throw new Error('Format de jalons invalide dans la réponse du LLM.');
  return res.data.milestones;
}
