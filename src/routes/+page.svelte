<script lang="ts">
  import { games$, statusCounts$ } from '$lib/stores/app';
  import GameCard from '$lib/ui/GameCard.svelte';
  import { createGame } from '$lib/storage/repositories';
  import { createGameFromDraft, searchMetadata } from '$lib/services/metadata';
  import { EFFORT_LABELS, STATUS_LABELS, STATUS_ORDER } from '$lib/domain/game';
  import type { EffortTag, Game, GameStatus } from '$lib/domain/types';
  import type { GameDraft } from '$lib/domain/ports';

  type Tab = 'active' | 'paused' | 'finished' | 'dropped' | 'all';
  let tab: Tab = 'active';
  let query = '';
  let showForm = false;
  let error = '';

  let title = '';
  let status: GameStatus = 'todo';
  let effort: EffortTag = 'mixed';
  let platforms = '';
  let genres = '';
  let releaseDate = '';

  let showSearch = false;
  let searchQuery = '';
  let searching = false;
  let searchError = '';
  let searchResults: GameDraft[] = [];

  async function doSearch() {
    searchError = '';
    if (!searchQuery.trim()) return;
    searching = true;
    try {
      searchResults = await searchMetadata(searchQuery);
      if (searchResults.length === 0) searchError = 'Aucun résultat.';
    } catch (e) {
      searchError = e instanceof Error ? e.message : String(e);
    } finally {
      searching = false;
    }
  }

  async function pickResult(draft: GameDraft) {
    searching = true;
    try {
      await createGameFromDraft(draft);
      showSearch = false;
      searchQuery = '';
      searchResults = [];
    } catch (e) {
      searchError = e instanceof Error ? e.message : String(e);
    } finally {
      searching = false;
    }
  }

  $: games = ($games$ ?? []) as Game[];
  $: counts = $statusCounts$ ?? {};
  $: filtered = games.filter((g) => {
    const matchesTab =
      tab === 'all'
        ? true
        : tab === 'active'
          ? g.status === 'in_progress' || g.status === 'todo'
          : tab === 'paused'
            ? g.status === 'paused'
            : tab === 'finished'
              ? g.status === 'completed' || g.status === 'completed_100'
              : g.status === 'dropped';
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || g.title.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'active', label: 'Actifs' },
    { id: 'paused', label: 'En sommeil' },
    { id: 'finished', label: 'Terminés' },
    { id: 'dropped', label: 'Abandonnés' },
    { id: 'all', label: 'Tout' }
  ];

  let tabCounts: Record<Tab, number> = { active: 0, paused: 0, finished: 0, dropped: 0, all: 0 };
  $: tabCounts = {
    active: (counts['in_progress'] ?? 0) + (counts['todo'] ?? 0),
    paused: counts['paused'] ?? 0,
    finished: (counts['completed'] ?? 0) + (counts['completed_100'] ?? 0),
    dropped: counts['dropped'] ?? 0,
    all: games.length
  };

  async function submit() {
    error = '';
    if (!title.trim()) {
      error = 'Le titre est requis.';
      return;
    }
    await createGame({
      title,
      status,
      effort,
      platformNames: platforms.split(','),
      genreNames: genres.split(','),
      releaseDate: releaseDate || undefined
    });
    title = '';
    platforms = '';
    genres = '';
    releaseDate = '';
    status = 'todo';
    effort = 'mixed';
    showForm = false;
  }
</script>

<div class="page-head">
  <h1>Bibliothèque</h1>
  <div style="display:flex; gap:.5rem; align-items:center; flex:1; max-width:420px;">
    <input type="search" placeholder="Rechercher un jeu…" bind:value={query} aria-label="Rechercher" />
    <button class="btn" on:click={() => (showSearch = true)} title="Rechercher via IGDB/RAWG">🔎 Métadonnées</button>
    <button class="btn primary" on:click={() => (showForm = true)}>+ Ajouter</button>
  </div>
</div>

<div class="tabs" role="tablist">
  {#each TABS as t (t.id)}
    <button class:active={tab === t.id} on:click={() => (tab = t.id)}>
      {t.label}{#if tabCounts[t.id] > 0} ({tabCounts[t.id]}){/if}
    </button>
  {/each}
</div>

{#if filtered.length === 0}
  <div class="empty">
    {games.length === 0
      ? 'Aucun jeu pour le moment. Ajoutez votre premier jeu pour commencer votre backlog.'
      : 'Aucun jeu ne correspond à ce filtre.'}
  </div>
{:else}
  <div class="grid">
    {#each filtered as g (g.id)}
      <GameCard game={g} />
    {/each}
  </div>
{/if}

{#if showSearch}
  <div class="modal-backdrop" on:click|self={() => (showSearch = false)} role="presentation">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Rechercher des métadonnées">
      <h2>🔎 Rechercher un jeu (IGDB / RAWG)</h2>
      {#if searchError}<div class="notice error">{searchError}</div>{/if}
      <form on:submit|preventDefault={doSearch}>
        <label class="field">
          <span>Titre du jeu</span>
          <input type="text" bind:value={searchQuery} placeholder="ex. : Hollow Knight" />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" on:click={() => (showSearch = false)}>Fermer</button>
          <button type="submit" class="btn primary" disabled={searching || !searchQuery.trim()}>
            {searching ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
      </form>
      {#if searchResults.length > 0}
        <div style="margin-top:.8rem; display:flex; flex-direction:column; gap:.4rem; max-height:50vh; overflow-y:auto;">
          {#each searchResults as r (r.externalIds.igdb ?? r.externalIds.rawg ?? r.title)}
            <button class="btn ghost" style="text-align:left; display:flex; gap:.6rem; align-items:center;" on:click={() => pickResult(r)} disabled={searching}>
              {#if r.coverRemoteUrl}<img src={r.coverRemoteUrl} alt="" style="width:32px; height:42px; object-fit:cover; border-radius:4px;" />{/if}
              <span>
                <strong>{r.title}</strong>
                {#if r.releaseDate}<span class="muted"> — {r.releaseDate}</span>{/if}
                <br /><span class="muted" style="font-size:.8rem;">{r.platforms.join(', ')} · {r.genres.join(', ')}</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if showForm}
  <div class="modal-backdrop" on:click|self={() => (showForm = false)} role="presentation">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Ajouter un jeu">
      <h2>Ajouter un jeu</h2>
      {#if error}<div class="notice error">{error}</div>{/if}
      <form on:submit|preventDefault={submit}>
        <label class="field">
          <span>Titre *</span>
          <input type="text" bind:value={title} placeholder="Nom du jeu" required />
        </label>
        <div class="form-row">
          <label class="field">
            <span>Statut</span>
            <select bind:value={status}>
              {#each STATUS_ORDER as s (s)}
                <option value={s}>{STATUS_LABELS[s]}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span>Type d'effort</span>
            <select bind:value={effort}>
              {#each Object.entries(EFFORT_LABELS) as [value, label] (value)}
                <option value={value}>{label}</option>
              {/each}
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="field">
            <span>Plateformes (séparées par des virgules)</span>
            <input type="text" bind:value={platforms} placeholder="PC, Switch…" />
          </label>
          <label class="field">
            <span>Genres (séparés par des virgules)</span>
            <input type="text" bind:value={genres} placeholder="RPG, Metroidvania…" />
          </label>
        </div>
        <label class="field">
          <span>Date de sortie</span>
          <input type="date" bind:value={releaseDate} />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" on:click={() => (showForm = false)}>Annuler</button>
          <button type="submit" class="btn primary">Ajouter</button>
        </div>
      </form>
    </div>
  </div>
{/if}
