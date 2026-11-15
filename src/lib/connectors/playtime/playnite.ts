import type { PlayniteGame } from '$lib/domain/ports';

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

function namesOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v : (v as { Name?: string; name?: string })?.Name ?? (v as { name?: string })?.name))
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

export function parsePlayniteJson(text: string): PlayniteGame[] {
  const data = JSON.parse(text) as unknown;
  const games = Array.isArray(data)
    ? data
    : (data as { games?: unknown[] })?.games;
  if (!Array.isArray(games)) throw new Error('JSON Playnite invalide : clé "games" absente.');
  return games
    .map((g) => {
      const r = g as Record<string, unknown>;
      const name = String(r.Name ?? r.name ?? '').trim();
      const id = r.Id ?? r.id;
      return {
        name,
        platforms: namesOf(r.Platforms ?? r.platforms),
        genres: namesOf(r.Genres ?? r.genres),
        releaseDate: normalizeDate(r.ReleaseDate ?? r.releaseDate),
        playtimeMinutes: Math.round(Number(r.Playtime ?? r.playtime ?? 0) / 60),
        playniteId: id != null && id !== '' ? String(id) : undefined
      };
    })
    .filter((g) => g.name.length > 0);
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function splitMulti(value: string): string[] {
  return value
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parsePlayniteCsv(text: string): PlayniteGame[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const sep = [',', ';', '\t'].find((s) => lines[0].includes(s)) ?? ',';
  const header = splitCsvLine(lines[0], sep).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => splitCsvLine(l, sep));
  const out: PlayniteGame[] = [];
  for (const cols of rows) {
    const get = (name: string): string => {
      const i = header.indexOf(name);
      return i >= 0 ? (cols[i] ?? '').trim() : '';
    };
    const name = get('name');
    if (!name) continue;
    out.push({
      name,
      platforms: splitMulti(get('platforms')),
      genres: splitMulti(get('genres')),
      releaseDate: normalizeDate(get('releasedate')),
      playtimeMinutes: Math.round(Number(get('playtime') || 0) / 60),
      playniteId: get('id') || undefined
    });
  }
  return out;
}
