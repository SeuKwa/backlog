import { z } from 'zod';
import type { BacklogExport } from '../types';

const uuid = z.string().min(1);
const iso = z.string().min(1);

const externalIdsSchema = z.object({
  igdb: z.number().optional(),
  rawg: z.number().optional(),
  steamAppId: z.number().optional(),
  retroachievementsId: z.number().optional(),
  playniteId: z.string().optional()
});

const hltbSchema = z.object({
  mainHours: z.number().positive().optional(),
  completionistHours: z.number().positive().optional()
});

const gameSchema = z.object({
  id: uuid,
  title: z.string().min(1),
  coverUrl: z.string().optional(),
  platformIds: z.array(z.string()).default([]),
  genreIds: z.array(z.string()).default([]),
  releaseDate: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'paused', 'completed', 'completed_100', 'dropped']),
  effort: z.enum(['calm_exploration', 'action_reflex', 'dense_narrative', 'mixed']),
  moodTags: z.array(z.string()).default([]),
  personalNotes: z.string().optional(),
  bookmark: z.string().optional(),
  externalIds: externalIdsSchema.default({}),
  hltb: hltbSchema.optional(),
  raProgress: z
    .object({ earned: z.number().int().min(0), total: z.number().int().min(0), updatedAt: iso })
    .optional(),
  playtimeMinutes: z.number().min(0).default(0),
  lastPlayedAt: iso.optional(),
  createdAt: iso,
  updatedAt: iso,
  completedAt: iso.optional()
});

const milestoneSchema = z.object({
  id: uuid,
  gameId: uuid,
  order: z.number().int().min(0),
  label: z.string().min(1),
  hint: z.string().optional(),
  source: z.enum(['manual', 'llm']),
  createdAt: iso,
  completedAt: iso.optional()
});

const sessionSchema = z.object({
  id: uuid,
  gameId: uuid,
  startedAt: iso.optional(),
  durationMinutes: z.number().positive(),
  kind: z.enum(['session', 'quick_checkin']),
  note: z.string().optional(),
  createdAt: iso
});

const backtrackSchema = z.object({
  id: uuid,
  gameId: uuid,
  text: z.string().min(1),
  tag: z.enum(['location', 'chest', 'quest', 'other']),
  resolved: z.boolean().default(false),
  createdAt: iso,
  resolvedAt: iso.optional()
});

const platformSchema = z.object({ id: z.string(), name: z.string() });
const genreSchema = z.object({ id: z.string(), name: z.string() });

const settingsSchema = z.object({
  id: z.literal('singleton'),
  fogOfWarEnabled: z.boolean().default(true),
  showRemainingTime: z.boolean().default(false),
  exportRespectsFogOfWar: z.boolean().default(true),
  llm: z
    .object({ baseUrl: z.string(), model: z.string(), apiKeyHandle: z.string() })
    .optional(),
  metadata: z
    .object({
      provider: z.enum(['igdb', 'rawg']),
      apiKeyHandle: z.string().optional(),
      clientIdHandle: z.string().optional(),
      clientSecretHandle: z.string().optional()
    })
    .optional(),
  playtime: z
    .object({
      steamApiKeyHandle: z.string().optional(),
      steamId: z.string().optional(),
      raUsername: z.string().optional(),
      raApiKeyHandle: z.string().optional()
    })
    .optional()
});

export const backlogExportSchema = z.object({
  format: z.literal('gamevault-backlog'),
  version: z.literal(1),
  exportedAt: iso,
  games: z.array(gameSchema),
  milestones: z.array(milestoneSchema),
  sessions: z.array(sessionSchema),
  backtrackNotes: z.array(backtrackSchema),
  platforms: z.array(platformSchema).default([]),
  genres: z.array(genreSchema).default([]),
  settings: settingsSchema.partial().optional()
});

export type ParsedExport = z.infer<typeof backlogExportSchema>;

export function parseBacklogExport(data: unknown): ParsedExport {
  const result = backlogExportSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Export invalide — ${details}`);
  }
  return result.data;
}

export function buildExport(
  input: Omit<BacklogExport, 'format' | 'version' | 'exportedAt'>,
  exportedAt = new Date().toISOString()
): BacklogExport {
  return { format: 'gamevault-backlog', version: 1, exportedAt, ...input };
}
