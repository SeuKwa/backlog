<script lang="ts">
  import { stats$ } from '$lib/stores/app';
  import { STATUS_LABELS } from '$lib/domain/game';
  import { formatMinutes } from '$lib/domain/export/markdown';

  $: stats = $stats$;

  function barWidth(minutes: number, max: number): string {
    if (max <= 0) return '0%';
    return `${Math.max(2, Math.round((minutes / max) * 100))}%`;
  }

  $: maxMonth = stats ? Math.max(...stats.byMonth.map((m) => m.minutes), 0) : 0;
  $: maxGenre = stats ? Math.max(...stats.byGenre.map((g) => g.minutes), 0) : 0;
  $: maxPlatform = stats ? Math.max(...stats.byPlatform.map((p) => p.minutes), 0) : 0;
</script>

<div class="page-head">
  <h1>📊 Statistiques</h1>
</div>

{#if !stats}
  <div class="empty">Chargement…</div>
{:else if stats.gamesCount === 0}
  <div class="empty">Aucune donnée pour le moment. Ajoutez des jeux et faites des check-ins pour voir vos stats.</div>
{:else}
  <div class="stat-grid">
    <div class="panel stat-card"><div class="stat-value">{stats.gamesCount}</div><div class="muted">jeux</div></div>
    <div class="panel stat-card"><div class="stat-value">{formatMinutes(stats.totalMinutes)}</div><div class="muted">jouées au total</div></div>
    <div class="panel stat-card"><div class="stat-value">{stats.activeCount}</div><div class="muted">actifs</div></div>
    <div class="panel stat-card"><div class="stat-value">{stats.finishedCount}</div><div class="muted">terminés</div></div>
    <div class="panel stat-card"><div class="stat-value">{stats.milestonesDone}</div><div class="muted">jalons validés</div></div>
    <div class="panel stat-card"><div class="stat-value">{stats.avgSessionMinutes > 0 ? formatMinutes(stats.avgSessionMinutes) : '—'}</div><div class="muted">par session (moy.)</div></div>
  </div>

  <div class="panel">
    <h2>Temps par mois</h2>
    {#if stats.byMonth.length === 0}
      <p class="muted">Aucune session enregistrée.</p>
    {:else}
      {#each stats.byMonth as m (m.month)}
        <div class="bar-row">
          <span class="bar-label">{m.month}</span>
          <div class="bar-track"><div class="bar-fill" style="width:{barWidth(m.minutes, maxMonth)}"></div></div>
          <span class="bar-value">{formatMinutes(m.minutes)}</span>
        </div>
      {/each}
    {/if}
  </div>

  <div class="form-row">
    <div class="panel">
      <h2>Par genre</h2>
      {#if stats.byGenre.length === 0}
        <p class="muted">Aucun genre renseigné.</p>
      {:else}
        {#each stats.byGenre as g (g.name)}
          <div class="bar-row">
            <span class="bar-label">{g.name}</span>
            <div class="bar-track"><div class="bar-fill" style="width:{barWidth(g.minutes, maxGenre)}"></div></div>
            <span class="bar-value">{formatMinutes(g.minutes)}</span>
          </div>
        {/each}
      {/if}
    </div>
    <div class="panel">
      <h2>Par plateforme</h2>
      {#if stats.byPlatform.length === 0}
        <p class="muted">Aucune plateforme renseignée.</p>
      {:else}
        {#each stats.byPlatform as p (p.name)}
          <div class="bar-row">
            <span class="bar-label">{p.name}</span>
            <div class="bar-track"><div class="bar-fill" style="width:{barWidth(p.minutes, maxPlatform)}"></div></div>
            <span class="bar-value">{formatMinutes(p.minutes)}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="panel">
    <h2>Par statut</h2>
    <div class="chips">
      {#each Object.entries(stats.byStatus) as [status, count] (status)}
        <span class="badge status-{status}">{STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status} : {count}</span>
      {/each}
    </div>
  </div>
{/if}
