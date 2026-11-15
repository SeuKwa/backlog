export type UUID = string;

export type GameStatus =
  | 'todo' // À faire
  | 'in_progress' // En cours
  | 'paused' // En sommeil (pause volontaire, données conservées)
  | 'completed' // Terminé (histoire principale)
  | 'completed_100' // 100 %
  | 'dropped'; // Abandonné

export type EffortTag = 'calm_exploration' | 'action_reflex' | 'dense_narrative' | 'mixed';

export type TimeBudget = '<45min' | '1-2h' | 'long';

export interface ExternalIds {
  igdb?: number;
  rawg?: number;
  steamAppId?: number;
  retroachievementsId?: number;
  playniteId?: string;
}

export interface HltbEstimate {
  mainHours?: number;
  completionistHours?: number;
}

export interface Game {
  id: UUID;
  title: string;
  coverUrl?: string;
  platformIds: string[];
  genreIds: string[];
  releaseDate?: string; // YYYY-MM-DD
  status: GameStatus;
  effort: EffortTag;
  moodTags: string[];
  personalNotes?: string;
  bookmark?: string; // marque-page de reprise, épinglée en haut de la fiche
  externalIds: ExternalIds;
  hltb?: HltbEstimate;
  playtimeMinutes: number;
  lastPlayedAt?: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type MilestoneSource = 'manual' | 'llm';

export interface Milestone {
  id: UUID;
  gameId: UUID;
  order: number; // 0..n-1, strictement séquentiel
  label: string; // libellé neutre, ex. "Étape 3"
  hint?: string; // détail, lisible uniquement quand le jalon est déverrouillé
  source: MilestoneSource;
  createdAt: string;
  completedAt?: string;
}

export type MilestoneState = 'locked' | 'current' | 'done';

export interface PlaySession {
  id: UUID;
  gameId: UUID;
  startedAt?: string;
  durationMinutes: number;
  kind: 'session' | 'quick_checkin';
  note?: string;
  createdAt: string;
}

export type BacktrackTag = 'location' | 'chest' | 'quest' | 'other';

export interface BacktrackNote {
  id: UUID;
  gameId: UUID;
  text: string;
  tag: BacktrackTag;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface Platform {
  id: string;
  name: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface LlmSettings {
  baseUrl: string;
  model: string;
  apiKeyHandle: string; // handle WebCrypto, la clé n'est jamais stockée en clair
}

export interface AppSettings {
  id: 'singleton';
  fogOfWarEnabled: boolean;
  showRemainingTime: boolean;
  exportRespectsFogOfWar: boolean;
  llm?: LlmSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'singleton',
  fogOfWarEnabled: true,
  showRemainingTime: false,
  exportRespectsFogOfWar: true
};

export interface BacklogExport {
  format: 'gamevault-backlog';
  version: 1;
  exportedAt: string;
  games: Game[];
  milestones: Milestone[];
  sessions: PlaySession[];
  backtrackNotes: BacktrackNote[];
  platforms: Platform[];
  genres: Genre[];
  settings?: Partial<AppSettings>;
}
