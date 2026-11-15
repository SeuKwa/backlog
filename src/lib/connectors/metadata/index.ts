import type { AppSettings, ExternalIds, GameDraft, MetadataProvider } from '$lib/domain/ports';
import { igdbDetails, igdbSearch } from './igdb';
import { rawgDetails, rawgSearch } from './rawg';

export async function createMetadataProvider(settings: AppSettings): Promise<MetadataProvider | null> {
  const md = settings.metadata;
  if (!md) return null;
  if (md.provider === 'igdb') {
    return {
      name: 'igdb',
      search: (q) => igdbSearch(settings, q),
      fetchDetails: (ids: ExternalIds) =>
        ids.igdb != null ? igdbDetails(settings, ids.igdb) : Promise.resolve(undefined)
    };
  }
  return {
    name: 'rawg',
    search: (q) => rawgSearch(settings, q),
    fetchDetails: (ids: ExternalIds) =>
      ids.rawg != null ? rawgDetails(settings, ids.rawg) : Promise.resolve(undefined)
  };
}

export type { GameDraft };
