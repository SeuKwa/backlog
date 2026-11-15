import { getSettings } from '$lib/storage/repositories';
import { chatCompletion } from './client';
import { MILESTONE_SYSTEM_PROMPT, buildMilestoneUserPrompt } from './prompts';
import { parseLlmMilestones, type MilestoneDraft } from './parse';

export async function generateMilestoneDrafts(
  title: string,
  existingCount: number
): Promise<MilestoneDraft[]> {
  const settings = await getSettings();
  const content = await chatCompletion(settings, [
    { role: 'system', content: MILESTONE_SYSTEM_PROMPT },
    { role: 'user', content: buildMilestoneUserPrompt(title, existingCount) }
  ]);
  return parseLlmMilestones(content);
}
