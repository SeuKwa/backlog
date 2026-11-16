<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { gameDetail$, settings$ } from '$lib/stores/app';
  import MilestoneTimeline from '$lib/ui/MilestoneTimeline.svelte';
  import QuickCheckinBar from '$lib/ui/QuickCheckinBar.svelte';
  import {
    addBacktrackNote,
    addMilestone,
    completeMilestone,
    deleteGame,
    deleteMilestone,
    getSettings,
    resolveBacktrackNote,
    updateGame,
    updateMilestone
  } from '$lib/storage/repositories';
  import { generateMilestoneDrafts } from '$lib/connectors/llm/generate';
  import { syncGamePlaytime } from '$lib/services/playtimeSync';
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
  import {
    DEFAULT_SETTINGS,
    type AppSettings,
    type BacktrackTag,
    type GameStatus,
    type Milestone
  } from '$lib/domain/types';
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

  type DraftItem = { label: string; hint: string; include: boolean };
  let drafts: DraftItem[] | null = null;
  let llmLoading = false;

  let backtrackText = '';
  let backtrackTag: BacktrackTag = 'other';

  let hltbMain = '';
  let hltbComp = '';
  let hltbInit: string | null = null;

  let steamAppIdInput = '';
  let raIdInput = '';
  let linkInit: string | null = null;
  let syncing = false;

  $: if (detail && hltbInit !== detail.game.id) {
    hltbInit = detail.game.id;
    hltbMain = detail.game.hltb?.mainHours != null ? String(detail.game.hltb.mainHours) : '';
    hltbComp = detail.game.hltb?.completionistHours != null ? String(detail.game.hltb.completionistHours) : '';
  }

  $: if (detail && linkInit !== detail.game.id) {
    linkInit = detail.game.id;
    steamAppIdInput = detail.game.externalIds.steamAppId != null ? String(detail.game.externalIds.steamAppId) : '';
    raIdInput =
      detail.game.externalIds.retroachievementsId != null
        ? String(detail.game.externalIds.retroachievementsId)
        : '';
  }

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
    const label = newLabel.trim();
    const hint = newHint;
    newLabel = '';
    newHint = '';
    await addMilestone(detail.game.id, label, hint);
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
    goto(`${base}/`);
  }

  async function onGenerateLlm() {
    if (!detail) return;
    error = '';
    llmLoading = true;
    try {
      const generated = await generateMilestoneDrafts(detail.game.title, detail.milestones.length);
      drafts = generated.map((d) => ({ label: d.label, hint: d.hint ?? '', include: true }));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      llmLoading = false;
    }
  }

  async function onAddDrafts() {
    if (!detail || !drafts) return;
    error = '';
    try {
      for (const d of drafts) {
        if (d.include && d.label.trim()) {
          await addMilestone(detail.game.id, d.label, d.hint || undefined, 'llm');
        }
      }
      drafts = null;
      flash('Jalons ajoutés (source LLM, éditables comme les manuels).');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function onAddBacktrack() {
    if (!detail || !backtrackText.trim()) return;
    await addBacktrackNote(detail.game.id, backtrackText, backtrackTag);
    backtrackText = '';
  }

  async function saveLinks() {
    if (!detail) return;
    const steam = Number(steamAppIdInput);
    const ra = Number(raIdInput);
    await updateGame(detail.game.id, {
      externalIds: {
        ...detail.game.externalIds,
        steamAppId: Number.isFinite(steam) && steam > 0 ? steam : detail.game.externalIds.steamAppId,
        retroachievementsId: Number.isFinite(ra) && ra > 0 ? ra : detail.game.externalIds.retroachievementsId
      }
    });
  }

  async function onSync() {
    if (!detail) return;
    error = '';
    syncing = true;
    try {
      notice = await syncGamePlaytime(detail.game.id);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      syncing = false;
    }
  }

  async function onSaveHltb() {
    if (!detail) return;
    const main = Number(hltbMain);
    const comp = Number(hltbComp);
    await updateGame(detail.game.id, {
      hltb: {
        mainHours: Number.isFinite(main) && main > 0 ? main : undefined,
        completionistHours: Number.isFinite(comp) && comp > 0 ? comp : undefined
      }
    });
    flash('Durées de référence enregistrées.');
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
  <div class="empty">Jeu introuvable. <a href="{base}/" style="color:var(--accent)">Retour à la bibliothèque</a></div>
{:else}
  <div class="panel">
    <div class="detail-head">
      {#if detail.game.coverUrl}
        <img class="cover cover-img" src={detail.game.coverUrl} alt="Jaquette de {detail.game.title}" />
      {:else}
        <div class="cover" aria-hidden="true">{detail.game.title.charAt(0).toUpperCase()}</div>
      {/if}
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
    <div class="actions-row">
      <button class="btn accent sm" on:click={onGenerateLlm} disabled={llmLoading}>
        {llmLoading ? 'Génération…' : '✨ Générer des jalons (LLM)'}
      </button>
    </div>

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

  <section class="panel">
    <h2>🗺️ Carnet de backtracking</h2>
    {#if detail.backtrackNotes.length === 0}
      <p class="muted">Aucune note. Ajoutez les lieux, coffres ou quêtes bloqués nécessitant une compétence future.</p>
    {:else}
      <ul style="list-style:none; margin:0 0 .8rem; padding:0; display:flex; flex-direction:column; gap:.4rem;">
        {#each [...detail.backtrackNotes].sort((a, b) => Number(a.resolved) - Number(b.resolved)) as n (n.id)}
          <li class="card" style="padding:.5rem .7rem; display:flex; gap:.6rem; align-items:center; justify-content:space-between;">
            <span style={n.resolved ? 'text-decoration:line-through; color:var(--muted);' : ''}>
              <span class="badge">{n.tag}</span> {n.text}
            </span>
            {#if !n.resolved}
              <button class="btn sm primary" on:click={() => resolveBacktrackNote(n.id)}>Résolu ✓</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <div class="form-row">
      <label class="field">
        <span>Nouvelle note</span>
        <input type="text" bind:value={backtrackText} placeholder="Coffre à clé rouge, donjon Est…" />
      </label>
      <label class="field">
        <span>Type</span>
        <select bind:value={backtrackTag}>
          <option value="location">Lieu</option>
          <option value="chest">Coffre</option>
          <option value="quest">Quête</option>
          <option value="other">Autre</option>
        </select>
      </label>
    </div>
    <button class="btn primary sm" on:click={onAddBacktrack} disabled={!backtrackText.trim()}>+ Ajouter</button>
  </section>

  <section class="panel">
    <h2>🔗 Connecteurs externes (Steam / RetroAchievements)</h2>
    <div class="form-row">
      <label class="field">
        <span>App ID Steam</span>
        <input
          type="number"
          min="0"
          value={steamAppIdInput}
          on:input={(ev) => (steamAppIdInput = (ev.currentTarget as HTMLInputElement).value)}
          on:change={saveLinks}
          placeholder="renseigné auto via RAWG/IGDB"
        />
      </label>
      <label class="field">
        <span>ID RetroAchievements</span>
        <input
          type="number"
          min="0"
          value={raIdInput}
          on:input={(ev) => (raIdInput = (ev.currentTarget as HTMLInputElement).value)}
          on:change={saveLinks}
        />
      </label>
    </div>
    {#if detail.game.raProgress}
      <p class="muted" style="font-size:.85rem;">
        Succès RA : {detail.game.raProgress.earned}/{detail.game.raProgress.total}
        (maj. {detail.game.raProgress.updatedAt.slice(0, 10)})
      </p>
    {/if}
    <div class="actions-row">
      <button class="btn accent sm" on:click={onSync} disabled={syncing}>
        {syncing ? 'Synchronisation…' : '🔄 Synchroniser (Steam / RA)'}
      </button>
    </div>
  </section>

  <section class="panel">
    <h2>⏳ Durées de référence (HLTB)</h2>
    <div class="form-row">
      <label class="field">
        <span>Histoire principale (h)</span>
        <input
          type="number"
          min="0"
          step="0.5"
          value={hltbMain}
          on:input={(ev) => (hltbMain = (ev.currentTarget as HTMLInputElement).value)}
          on:change={onSaveHltb}
        />
      </label>
      <label class="field">
        <span>Complétionniste (h)</span>
        <input
          type="number"
          min="0"
          step="0.5"
          value={hltbComp}
          on:input={(ev) => (hltbComp = (ev.currentTarget as HTMLInputElement).value)}
          on:change={onSaveHltb}
        />
      </label>
    </div>
    <p class="muted" style="font-size:.85rem; margin:.2rem 0 0;">Sert à l'estimation du temps restant (option dans les paramètres).</p>
  </section>

  {#if drafts}
    <div class="modal-backdrop" on:click|self={() => (drafts = null)} role="presentation">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Brouillon de jalons LLM" style="max-width:560px;">
        <h2>✨ Jalons proposés par le LLM</h2>
        <p class="muted" style="font-size:.85rem;">Anti-spoiler : vérifiez et éditez avant validation, rien n'est ajouté automatiquement.</p>
        {#each drafts as d, i (i)}
          <div style="display:flex; gap:.5rem; align-items:flex-start; margin-bottom:.5rem;">
            <input type="checkbox" bind:checked={d.include} style="width:20px; height:20px; margin-top:.45rem;" />
            <div style="flex:1;">
              <input type="text" bind:value={d.label} />
              <input type="text" bind:value={d.hint} placeholder="Indice (optionnel)" style="margin-top:.3rem;" />
            </div>
          </div>
        {/each}
        <div class="modal-actions">
          <button class="btn ghost" on:click={() => (drafts = null)}>Annuler</button>
          <button class="btn primary" on:click={onAddDrafts} disabled={!drafts.some((d) => d.include)}>
            Ajouter {drafts.filter((d) => d.include).length} jalon(s)
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if isActive(detail.game)}
    <QuickCheckinBar
      canValidateMilestone={currentExists}
      onCheckin={onCheckin}
      onValidateMilestone={onValidateMilestone}
    />
  {/if}
{/if}
