<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { gameDetail$, settings$ } from '$lib/stores/app';
  import MilestoneTimeline from '$lib/ui/MilestoneTimeline.svelte';
  import QuickCheckinBar from '$lib/ui/QuickCheckinBar.svelte';
  import {
    addMilestone,
    completeMilestone,
    deleteGame,
    deleteMilestone,
    getSettings,
    updateGame,
    updateMilestone
  } from '$lib/storage/repositories';
  import {
    currentMilestone,
    quickCheckin,
    setBookmark,
    setStatus,
    validateCurrentMilestone
  } from '$lib/services/actions';
  import { downloadText } from '$lib/storage/backup';
  import { EFFORT_LABELS, STATUS_LABELS, STATUS_ORDER, isActive } from '$lib/domain/game';
  import { remainingHours } from '$lib/domain/estimates';
  import { gameToMarkdown, formatMinutes } from '$lib/domain/export/markdown';
  import { DEFAULT_SETTINGS, type AppSettings, type GameStatus, type Milestone } from '$lib/domain/types';
  import type { GameDetail } from '$lib/services/actions';

  let detail: GameDetail | undefined;
  let settings: AppSettings = DEFAULT_SETTINGS;
  let error = '';
  let notice = '';

  let bookmarkDraft: string | null = null;
  let newLabel = '';
  let newHint = '';
  let editingId: string | null = null;
  let editLabel = '';
  let editHint = '';
  let currentExists = false;

  let detailSub: { unsubscribe(): void } | undefined;
  let settingsSub: { unsubscribe(): void } | undefined;

  function subscribeDetail(id: string) {
    detailSub?.unsubscribe();
    detailSub = gameDetail$(id).subscribe((v) => {
      detail = v;
      if (v && bookmarkDraft === null) bookmarkDraft = v.game.bookmark ?? '';
    });
  }

  $: if ($page.params.id) subscribeDetail($page.params.id);

  onMount(() => {
    settingsSub = settings$.subscribe((v) => {
      if (v) settings = v;
    });
    return () => {
      detailSub?.unsubscribe();
      settingsSub?.unsubscribe();
    };
  });

  async function refreshCurrent(id: string) {
    currentExists = (await currentMilestone(id)) !== undefined;
  }

  $: if (detail) void refreshCurrent(detail.game.id);
  $: remaining =
    settings.showRemainingTime && detail ? remainingHours(detail.game, detail.milestones) : null;

  function flash(msg: string) {
    notice = msg;
    setTimeout(() => (notice = ''), 3000);
  }

  async function onCheckin(minutes: 30 | 60) {
    if (!detail) return;
    await quickCheckin(detail.game.id, minutes);
    flash(`+${minutes} min enregistrées.`);
  }

  async function onValidateMilestone() {
    if (!detail) return;
    error = '';
    try {
      await validateCurrentMilestone(detail.game.id);
      flash('Jalon validé ✔');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function onValidate(id: string) {
    error = '';
    try {
      await completeMilestone(id);
      flash('Jalon validé ✔');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function onAddMilestone() {
    if (!detail || !newLabel.trim()) return;
    await addMilestone(detail.game.id, newLabel, newHint);
    newLabel = '';
    newHint = '';
  }

  function onEdit(id: string) {
    const m = detail?.milestones.find((x) => x.id === id);
    if (!m) return;
    editingId = id;
    editLabel = m.label;
    editHint = m.hint ?? '';
  }

  async function onSaveEdit() {
    if (!editingId) return;
    await updateMilestone(editingId, { label: editLabel, hint: editHint });
    editingId = null;
  }

  async function onDeleteMilestone(id: string) {
    await deleteMilestone(id);
  }

  async function saveBookmark() {
    if (!detail || bookmarkDraft === null) return;
    await setBookmark(detail.game.id, bookmarkDraft);
    flash('Marque-page enregistrée.');
  }

  async function onStatusChange(ev: Event) {
    if (!detail) return;
    const to = (ev.currentTarget as HTMLSelectElement).value as GameStatus;
    await setStatus(detail.game.id, to);
  }

  async function onDeleteGame() {
    if (!detail) return;
    if (!confirm(`Supprimer définitivement « ${detail.game.title} » et toutes ses données ?`)) return;
    await deleteGame(detail.game.id);
    goto('/');
  }

  async function exportMarkdown() {
    if (!detail) return;
    const s = await getSettings();
    const md = gameToMarkdown(detail.game, detail.milestones, {
      respectFog: s.exportRespectsFogOfWar
    });
    const safe = detail.game.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    downloadText(`${safe || 'jeu'}.md`, md, 'text/markdown');
  }
</script>

{#if !detail}
  <div class="empty">Jeu introuvable. <a href="/" style="color:var(--accent)">Retour à la bibliothèque</a></div>
{:else}
  <div class="panel">
    <div class="detail-head">
      <div class="cover" aria-hidden="true">{detail.game.title.charAt(0).toUpperCase()}</div>
      <div style="flex:1; min-width: 220px;">
        <h1>{detail.game.title}</h1>
        <div class="kv">
          {#if detail.game.releaseDate}<span>📅 {detail.game.releaseDate}</span>{/if}
          <span>⏱️ {formatMinutes(detail.game.playtimeMinutes)}</span>
          {#if remaining !== null}<span>⏳ ~{remaining} h restantes</span>{/if}
          <span>🧠 {EFFORT_LABELS[detail.game.effort]}</span>
        </div>
        <div class="actions-row">
          <label class="muted" style="font-size:.85rem">
            Statut&nbsp;
            <select value={detail.game.status} on:change={onStatusChange} style="width:auto; min-height:38px;">
              {#each STATUS_ORDER as s (s)}
                <option value={s}>{STATUS_LABELS[s]}</option>
              {/each}
            </select>
          </label>
          <button class="btn sm ghost" on:click={exportMarkdown}>⬇ Export Markdown</button>
          <button class="btn sm danger" on:click={onDeleteGame}>Supprimer</button>
        </div>
      </div>
    </div>
  </div>

  {#if error}<div class="notice error">{error}</div>{/if}
  {#if notice}<div class="notice ok">{notice}</div>{/if}

  <section class="panel bookmark-card">
    <h2>📌 Marque-page de reprise</h2>
    <textarea
      bind:value={bookmarkDraft}
      placeholder="Objectif immédiat avant de quitter la session… (ex. : récupérer l'objet X dans la zone Est)"
      on:blur={saveBookmark}
    ></textarea>
    <div class="actions-row">
      <button class="btn sm primary" on:click={saveBookmark}>Enregistrer le marque-page</button>
    </div>
  </section>

  <section class="panel">
    <h2>Jalons de progression {#if settings.fogOfWarEnabled}<span class="muted" style="font-weight:400; font-size:.8rem">(brouillard de guerre actif)</span>{/if}</h2>
    <MilestoneTimeline
      milestones={detail.milestones}
      fogEnabled={settings.fogOfWarEnabled}
      onValidate={onValidate}
      onEdit={onEdit}
      onDelete={onDeleteMilestone}
    />
    <div class="form-row" style="margin-top:.8rem;">
      <label class="field">
        <span>Nouveau jalon (libellé neutre, sans spoiler)</span>
        <input type="text" bind:value={newLabel} placeholder="Étape 4" />
      </label>
      <label class="field">
        <span>Indice (visible une fois le jalon déverrouillé)</span>
        <input type="text" bind:value={newHint} placeholder="Atteindre la ville portuaire" />
      </label>
    </div>
    <button class="btn primary sm" on:click={onAddMilestone} disabled={!newLabel.trim()}>+ Ajouter un jalon</button>

    {#if editingId}
      <div class="modal-backdrop" on:click|self={() => (editingId = null)} role="presentation">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Modifier le jalon">
          <h2>Modifier le jalon</h2>
          <label class="field">
            <span>Libellé</span>
            <input type="text" bind:value={editLabel} />
          </label>
          <label class="field">
            <span>Indice</span>
            <input type="text" bind:value={editHint} />
          </label>
          <div class="modal-actions">
            <button class="btn ghost" on:click={() => (editingId = null)}>Annuler</button>
            <button class="btn primary" on:click={onSaveEdit}>Enregistrer</button>
          </div>
        </div>
      </div>
    {/if}
  </section>

  <section class="panel">
    <h2>Notes personnelles</h2>
    <textarea
      value={detail.game.personalNotes ?? ''}
      placeholder="Vos notes (ce que vous voulez, rien n'est envoyé ailleurs)…"
      on:blur={(ev) => updateGame(detail!.game.id, { personalNotes: (ev.currentTarget as HTMLTextAreaElement).value.trim() || undefined })}
    ></textarea>
  </section>

  {#if isActive(detail.game)}
    <QuickCheckinBar
      canValidateMilestone={currentExists}
      onCheckin={onCheckin}
      onValidateMilestone={onValidateMilestone}
    />
  {/if}
{/if}
