import type { Table } from 'dexie';
import { db } from './db';
import { newId } from './id';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type BacktrackNote,
  type BacktrackTag,
  type EffortTag,
  type Game,
  type GameStatus,
  type Milestone,
  type MilestoneSource,
  type PlaySession
} from '$lib/domain/types';
import { applyStatus } from '$lib/domain/game';
import { canComplete } from '$lib/domain/fog';

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureLookup<T extends { id: string; name: string }>(
  table: Table<T, string>,
  names: string[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const id = slug(name) || newId();
    const existing = await table.get(id);
    if (!existing) await table.add({ id, name } as T);
    ids.push(id);
  }
  return ids;
}

async function touch(gameId: string): Promise<void> {
  await db.games.update(gameId, { updatedAt: new Date().toISOString() });
}

export async function listGames(): Promise<Game[]> {
  return db.games.orderBy('updatedAt').reverse().toArray();
}

export async function getGame(id: string): Promise<Game | undefined> {
  return db.games.get(id);
}

export async function listMilestones(gameId: string): Promise<Milestone[]> {
  return db.milestones.where('gameId').equals(gameId).toArray();
}

export async function listSessions(gameId: string): Promise<PlaySession[]> {
  return db.sessions.where('gameId').equals(gameId).sortBy('createdAt');
}

export async function listBacktrackNotes(gameId: string): Promise<BacktrackNote[]> {
  return db.backtrackNotes.where('gameId').equals(gameId).toArray();
}

export async function createGame(input: {
  title: string;
  status?: GameStatus;
  effort?: EffortTag;
  platformNames?: string[];
  genreNames?: string[];
  releaseDate?: string;
  personalNotes?: string;
}): Promise<Game> {
  const now = new Date().toISOString();
  const platformIds = await ensureLookup(db.platforms, input.platformNames ?? []);
  const genreIds = await ensureLookup(db.genres, input.genreNames ?? []);
  const game: Game = {
    id: newId(),
    title: input.title.trim(),
    platformIds,
    genreIds,
    releaseDate: input.releaseDate || undefined,
    status: input.status ?? 'todo',
    effort: input.effort ?? 'mixed',
    moodTags: [],
    personalNotes: input.personalNotes?.trim() || undefined,
    externalIds: {},
    playtimeMinutes: 0,
    createdAt: now,
    updatedAt: now
  };
  await db.games.add(game);
  return game;
}

export async function updateGame(id: string, patch: Partial<Game>): Promise<void> {
  await db.games.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function changeStatus(id: string, to: GameStatus): Promise<void> {
  const game = await db.games.get(id);
  if (!game) throw new Error('Jeu introuvable');
  await db.games.put(applyStatus(game, to));
}

export async function deleteGame(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.games,
    db.milestones,
    db.sessions,
    db.backtrackNotes,
    async () => {
      await db.backtrackNotes.where('gameId').equals(id).delete();
      await db.sessions.where('gameId').equals(id).delete();
      await db.milestones.where('gameId').equals(id).delete();
      await db.games.delete(id);
    }
  );
}

export async function addMilestone(
  gameId: string,
  label: string,
  hint?: string,
  source: MilestoneSource = 'manual'
): Promise<Milestone> {
  const existing = await listMilestones(gameId);
  const order = existing.length ? Math.max(...existing.map((m) => m.order)) + 1 : 0;
  const m: Milestone = {
    id: newId(),
    gameId,
    order,
    label: label.trim(),
    hint: hint?.trim() || undefined,
    source,
    createdAt: new Date().toISOString()
  };
  await db.milestones.add(m);
  await touch(gameId);
  return m;
}

export async function updateMilestone(
  id: string,
  patch: { label?: string; hint?: string }
): Promise<void> {
  const m = await db.milestones.get(id);
  if (!m) throw new Error('Jalon introuvable');
  await db.milestones.update(id, {
    ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
    hint: patch.hint !== undefined ? patch.hint.trim() || undefined : m.hint
  });
  await touch(m.gameId);
}

export async function deleteMilestone(id: string): Promise<void> {
  const m = await db.milestones.get(id);
  if (!m) return;
  await db.milestones.delete(id);
  await touch(m.gameId);
}

export async function completeMilestone(id: string): Promise<void> {
  const m = await db.milestones.get(id);
  if (!m) throw new Error('Jalon introuvable');
  if (m.completedAt) return;
  const all = await listMilestones(m.gameId);
  if (!canComplete(m, all)) {
    throw new Error('Validez d’abord les jalons précédents (brouillard de guerre).');
  }
  await db.milestones.update(id, { completedAt: new Date().toISOString() });
  await touch(m.gameId);
}

export async function addSession(
  gameId: string,
  durationMinutes: number,
  kind: PlaySession['kind'] = 'quick_checkin',
  note?: string
): Promise<PlaySession> {
  const now = new Date().toISOString();
  const s: PlaySession = {
    id: newId(),
    gameId,
    durationMinutes,
    kind,
    note: note?.trim() || undefined,
    createdAt: now
  };
  await db.transaction('rw', db.sessions, db.games, async () => {
    await db.sessions.add(s);
    const g = await db.games.get(gameId);
    if (!g) return;
    await db.games.update(gameId, {
      playtimeMinutes: g.playtimeMinutes + durationMinutes,
      lastPlayedAt: now,
      updatedAt: now
    });
  });
  return s;
}

export async function addBacktrackNote(
  gameId: string,
  text: string,
  tag: BacktrackTag
): Promise<BacktrackNote> {
  const note: BacktrackNote = {
    id: newId(),
    gameId,
    text: text.trim(),
    tag,
    resolved: false,
    createdAt: new Date().toISOString()
  };
  await db.backtrackNotes.add(note);
  await touch(gameId);
  return note;
}

export async function resolveBacktrackNote(id: string): Promise<void> {
  const note = await db.backtrackNotes.get(id);
  if (!note) return;
  await db.backtrackNotes.update(id, { resolved: true, resolvedAt: new Date().toISOString() });
  await touch(note.gameId);
}

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  await db.settings.add(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: 'singleton' });
}
