import type { HltbEstimate } from '$lib/domain/types';
import { getGame, getSettings, updateGame } from '$lib/storage/repositories';
import { searchHltb } from '$lib/connectors/hltb/hltb';

export async function fetchHltbForTitle(title: string): Promise<HltbEstimate | null> {
  const settings = await getSettings();
  return searchHltb(title, settings);
}

export async function fillHltbForGame(
  gameId: string,
  opts: { overwrite?: boolean } = {}
): Promise<HltbEstimate | null> {
  const game = await getGame(gameId);
  if (!game) throw new Error('Jeu introuvable.');
  const est = await fetchHltbForTitle(game.title);
  if (!est) return null;
  const alreadySet = game.hltb?.mainHours != null || game.hltb?.completionistHours != null;
  if (!opts.overwrite && alreadySet) return game.hltb ?? null;
  await updateGame(gameId, { hltb: est });
  return est;
}
