import type { Game, Genre, Milestone, Platform, PlaySession } from './types';

export interface StatsInput {
  games: Game[];
  sessions: PlaySession[];
  milestones: Milestone[];
  genres: Genre[];
  platforms: Platform[];
}

export interface NamedMinutes {
  name: string;
  minutes: number;
}

export interface Stats {
  gamesCount: number;
  totalMinutes: number;
  activeCount: number;
  finishedCount: number;
  milestonesDone: number;
  avgSessionMinutes: number;
  byMonth: { month: string; minutes: number }[];
  byGenre: NamedMinutes[];
  byPlatform: NamedMinutes[];
  byStatus: Record<string, number>;
}

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function splitAcross(game: Game, names: Map<string, string>): NamedMinutes[] {
  const out = new Map<string, number>();
  const keys = [...names.keys()].filter((id) => game.platformIds.includes(id) || game.genreIds.includes(id));
  const targets = keys.length > 0 ? keys : ['(non renseigné)'];
  for (const k of targets) {
    out.set(k, (out.get(k) ?? 0) + game.playtimeMinutes / targets.length);
  }
  return [...out.entries()].map(([name, minutes]) => ({
    name: names.get(name) ?? name,
    minutes: Math.round(minutes)
  }));
}

export function computeStats(input: StatsInput): Stats {
  const { games, sessions, milestones, genres, platforms } = input;
  const genreNames = new Map(genres.map((g) => [g.id, g.name]));
  const platformNames = new Map(platforms.map((p) => [p.id, p.name]));

  const byStatus: Record<string, number> = {};
  for (const g of games) byStatus[g.status] = (byStatus[g.status] ?? 0) + 1;

  const monthMap = new Map<string, number>();
  for (const s of sessions) {
    const m = monthOf(s.createdAt);
    monthMap.set(m, (monthMap.get(m) ?? 0) + s.durationMinutes);
  }
  const byMonth = [...monthMap.entries()]
    .map(([month, minutes]) => ({ month, minutes }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const genreTotals = new Map<string, number>();
  const platformTotals = new Map<string, number>();
  for (const g of games) {
    for (const e of splitAcross(g, genreNames)) genreTotals.set(e.name, (genreTotals.get(e.name) ?? 0) + e.minutes);
    for (const e of splitAcross(g, platformNames)) {
      platformTotals.set(e.name, (platformTotals.get(e.name) ?? 0) + e.minutes);
    }
  }
  const sortDesc = (a: NamedMinutes, b: NamedMinutes) => b.minutes - a.minutes;
  const byGenre = [...genreTotals.entries()]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort(sortDesc)
    .slice(0, 8);
  const byPlatform = [...platformTotals.entries()]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort(sortDesc)
    .slice(0, 8);

  const totalMinutes = games.reduce((acc, g) => acc + g.playtimeMinutes, 0);
  return {
    gamesCount: games.length,
    totalMinutes,
    activeCount: games.filter((g) => g.status === 'in_progress' || g.status === 'todo').length,
    finishedCount: games.filter((g) => g.status === 'completed' || g.status === 'completed_100').length,
    milestonesDone: milestones.filter((m) => !!m.completedAt).length,
    avgSessionMinutes: sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0,
    byMonth,
    byGenre,
    byPlatform,
    byStatus
  };
}
