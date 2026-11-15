import type { AppSettings, ExternalIds, Game } from './types';

export type { ExternalIds };

export interface GameDraft {
  title: string;
  releaseDate?: string;
  platforms: string[];
  genres: string[];
  coverRemoteUrl?: string;
  externalIds: ExternalIds;
}

export interface MetadataProvider {
  name: 'igdb' | 'rawg';
  search(query: string): Promise<GameDraft[]>;
  fetchDetails(ids: ExternalIds): Promise<GameDraft | undefined>;
}

export interface PlaytimeImport {
  name: string;
  parse(fileText: string, fileName: string): PlayniteGame[];
}

export interface PlayniteGame {
  name: string;
  platforms: string[];
  genres: string[];
  releaseDate?: string;
  playtimeMinutes: number;
  playniteId?: string;
}

export interface LlmClient {
  complete(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string>;
}

export type { AppSettings, Game };

