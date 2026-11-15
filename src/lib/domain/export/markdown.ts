import type { Game, Milestone } from '../types';
import { EFFORT_LABELS, STATUS_LABELS } from '../game';
import { maskMilestones, progressRatio } from '../fog';

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Fiche Markdown d'un jeu. Par défaut, respecte le brouillard de guerre :
 * les jalons verrouillés apparaissent comme « Étape X — ??? » sans indice.
 */
export function gameToMarkdown(
  game: Game,
  milestones: Milestone[],
  opts: { respectFog?: boolean } = {}
): string {
  const respectFog = opts.respectFog ?? true;
  const masked = maskMilestones(milestones, respectFog);
  const done = masked.filter((m) => m.state === 'done').length;
  const lines: string[] = [];
  lines.push(`# ${game.title}`);
  lines.push('');
  lines.push(`- **Statut** : ${STATUS_LABELS[game.status]}`);
  if (game.releaseDate) lines.push(`- **Sortie** : ${game.releaseDate}`);
  lines.push(`- **Temps de jeu** : ${formatMinutes(game.playtimeMinutes)}`);
  if (masked.length > 0) {
    lines.push(
      `- **Progression** : ${Math.round(progressRatio(milestones) * 100)} % des jalons (${done}/${masked.length})`
    );
  }
  lines.push(`- **Effort** : ${EFFORT_LABELS[game.effort]}`);
  if (game.bookmark) {
    lines.push('');
    lines.push('## 📌 Marque-page de reprise');
    lines.push('');
    lines.push(`> ${game.bookmark}`);
  }
  lines.push('');
  lines.push('## Jalons');
  lines.push('');
  if (masked.length === 0) lines.push('_Aucun jalon défini._');
  for (const m of masked) {
    const mark = m.state === 'done' ? '[x]' : m.state === 'current' ? '[>]' : '[ ]';
    const hint = m.hint ? ` — ${m.hint}` : '';
    lines.push(`- ${mark} ${m.label}${hint}`);
  }
  if (game.personalNotes) {
    lines.push('');
    lines.push('## Notes personnelles');
    lines.push('');
    lines.push(game.personalNotes);
  }
  lines.push('');
  return lines.join('\n');
}

export function libraryToMarkdown(
  games: Game[],
  milestonesByGame: Map<string, Milestone[]>,
  opts: { respectFog?: boolean } = {}
): string {
  return games
    .map((g) => gameToMarkdown(g, milestonesByGame.get(g.id) ?? [], opts))
    .join('\n---\n\n');
}
