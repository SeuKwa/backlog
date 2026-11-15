<script lang="ts">
  import { games$ } from '$lib/stores/app';
  import { db } from '$lib/storage/db';
  import { pickCandidates, pickRandom } from '$lib/domain/picker';
  import { EFFORT_LABELS, TIME_BUDGET_LABELS } from '$lib/domain/game';
  import { STATUS_LABELS } from '$lib/domain/game';
  import { formatMinutes } from '$lib/domain/export/markdown';
  import type { EffortTag, Game, Milestone, TimeBudget } from '$lib/domain/types';

  let budget: TimeBudget = '1-2h';
  let effort: EffortTag | 'any' = 'any';
  let result: Game | undefined;
  let candidateCount = 0;

  const EFFORT_OPTIONS: { value: EffortTag | 'any'; label: string }[] = [
    { value: 'any', label: 'Peu importe' },
    ...Object.entries(EFFORT_LABELS).map(([value, label]) => ({ value: value as EffortTag, label }))
  ];

  async function draw() {
    const games = ($games$ ?? []) as Game[];
    const allMilestones = await db.milestones.toArray();
    const byGame = new Map<string, Milestone[]>();
    for (const m of allMilestones) {
      const arr = byGame.get(m.gameId) ?? [];
      arr.push(m);
      byGame.set(m.gameId, arr);
    }
    const candidates = pickCandidates(games, { budget, effort }, byGame);
    candidateCount = candidates.length;
    result = pickRandom(candidates);
  }
</script>

<div class="page-head">
  <h1>🎲 À quoi je joue ce soir ?</h1>
</div>

<div class="panel">
  <div class="form-row">
    <label class="field">
      <span>Temps disponible</span>
      <select bind:value={budget}>
        {#each Object.entries(TIME_BUDGET_LABELS) as [value, label] (value)}
          <option value={value}>{label}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>Effort mental souhaité</span>
      <select bind:value={effort}>
        {#each EFFORT_OPTIONS as o (o.value)}
          <option value={o.value}>{o.label}</option>
        {/each}
      </select>
    </label>
  </div>
  <button class="btn primary" style="width:100%" on:click={draw}>Piocher un jeu</button>
</div>

{#if result}
  <a class="card game-card" href="/game/{result.id}" style="display:flex;">
    <div class="cover" aria-hidden="true">{result.title.charAt(0).toUpperCase()}</div>
    <div class="card-body">
      <div class="card-title" style="font-size:1.1rem;">{result.title}</div>
      <div class="card-meta">
        <span class="badge status-{result.status}">{STATUS_LABELS[result.status]}</span>
        <span class="muted">{formatMinutes(result.playtimeMinutes)} jouées</span>
      </div>
      {#if result.bookmark}
        <div class="bookmark">📌 {result.bookmark}</div>
      {/if}
      <p class="muted" style="margin:.5rem 0 0; font-size:.85rem;">→ Ouvrir la fiche pour reprendre là où vous en étiez</p>
    </div>
  </a>
{:else if candidateCount === 0 && $games$}
  <div class="empty">
    Aucun jeu ne correspond à ces critères. Élargissez le budget de temps ou l'effort, ou ajoutez des jeux « En cours » / « À faire ».
  </div>
{/if}
