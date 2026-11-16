import { z } from 'zod';
import type { AppSettings, HltbEstimate } from '$lib/domain/types';
import { loadSecret } from '$lib/storage/crypto';

const gameSchema = z.object({
  game_id: z.number().optional(),
  game_name: z.string().optional(),
  comp_main: z.number().optional(),
  comp_plus: z.number().optional(),
  comp_all: z.number().optional()
});

const responseSchema = z.object({
  data: z.array(gameSchema).optional()
});

export function parseHltbResponse(json: unknown): HltbEstimate | null {
  const res = responseSchema.safeParse(json);
  if (!res.success || !res.data.data || res.data.data.length === 0) return null;
  const g = res.data.data[0];
  const main = g.comp_main && g.comp_main > 0 ? g.comp_main : undefined;
  const plus = g.comp_plus && g.comp_plus > 0 ? g.comp_plus : undefined;
  const all = g.comp_all && g.comp_all > 0 ? g.comp_all : undefined;
  const completionist = plus ?? all;
  if (main == null && completionist == null) return null;
  return { mainHours: main, completionistHours: completionist };
}

export async function searchHltb(title: string, settings: AppSettings): Promise<HltbEstimate | null> {
  const handle = settings.hltb?.apiKeyHandle;
  if (!handle) return null;
  const key = await loadSecret(handle);
  if (!key) return null;
  const res = await fetch(`https://howlongtobeat.com/api/seek/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://howlongtobeat.com/' },
    body: JSON.stringify({
      searchType: 'games',
      searchTerms: [title],
      searchPage: 1,
      size: 5,
      searchOptions: {
        games: {
          userId: 0,
          platform: '',
          sortCategory: 'popular',
          rangeCategory: 'main',
          rangeTime: { min: null, max: null },
          modifier: '',
          rangeYears: { min: '', max: '' },
          filter: '',
          sort: 0,
          random: 0
        }
      },
      useCache: true
    })
  });
  if (!res.ok) throw new Error(`HowLongToBeat : HTTP ${res.status}`);
  return parseHltbResponse(await res.json());
}
