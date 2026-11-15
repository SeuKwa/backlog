import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  BacktrackNote,
  CoverRecord,
  Game,
  Genre,
  Milestone,
  Platform,
  PlaySession,
  SecretRecord
} from '$lib/domain/types';

export class BacklogDB extends Dexie {
  games!: Table<Game, string>;
  milestones!: Table<Milestone, string>;
  sessions!: Table<PlaySession, string>;
  backtrackNotes!: Table<BacktrackNote, string>;
  platforms!: Table<Platform, string>;
  genres!: Table<Genre, string>;
  settings!: Table<AppSettings, string>;
  secrets!: Table<SecretRecord, string>;
  covers!: Table<CoverRecord, string>;

  constructor() {
    super('backlog-db');
    this.version(1).stores({
      games: 'id, status, lastPlayedAt, updatedAt, *platformIds, *genreIds',
      milestones: 'id, gameId, [gameId+order]',
      sessions: 'id, gameId, createdAt',
      backtrackNotes: 'id, gameId, resolved',
      platforms: 'id, name',
      genres: 'id, name',
      settings: 'id'
    });
    this.version(2).stores({
      secrets: 'id',
      covers: 'id'
    });
  }
}

export const db = new BacklogDB();
