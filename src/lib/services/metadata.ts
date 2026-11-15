import type { GameDraft } from '$lib/domain/ports';
import { createMetadataProvider } from '$lib/connectors/metadata';
import { createGame, getGame, getSettings, updateGame } from '$lib/storage/repositories';
import { saveCoverFromUrl } from '$lib/storage/covers';
import type { Game } from '$lib/domain/types';

export async function searchMetadata(query: string): Promise<GameDraft[]> {
  const settings = await getSettings();
  const provider = await createMetadataProvider(settings);
  if (!provider) throw new Error('Aucun fournisseur de métadonnées configuré (Paramètres).');
  return provider.search(query);
}

export async function createGameFromDraft(draft: GameDraft): Promise<Game> {
  const game = await createGame({
    title: draft.title,
    platformNames: draft.platforms,
    genreNames: draft.genres,
    releaseDate: draft.releaseDate
  });
  await updateGame(game.id, { externalIds: draft.externalIds });
  if (draft.coverRemoteUrl) {
    try {
      const coverUrl = await saveCoverFromUrl(game.id, draft.coverRemoteUrl);
      await updateGame(game.id, { coverUrl });
    } catch {
      // jaquette indisponible, le jeu est créé sans
    }
  }
  const updated = await getGame(game.id);
  if (!updated) throw new Error('Jeu introuvable après création.');
  return updated;
}
