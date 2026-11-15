<script lang="ts">
  import { onMount } from 'svelte';
  import { settings$ } from '$lib/stores/app';
  import { db } from '$lib/storage/db';
  import { saveSettings } from '$lib/storage/repositories';
  import { DEFAULT_SETTINGS, type AppSettings } from '$lib/domain/types';

  let settings: AppSettings = DEFAULT_SETTINGS;
  let confirmReset = false;
  let notice = '';

  onMount(() => {
    const sub = settings$.subscribe((v) => {
      if (v) settings = v;
    });
    return () => sub.unsubscribe();
  });

  function flash(msg: string) {
    notice = msg;
    setTimeout(() => (notice = ''), 3000);
  }

  async function toggle(patch: Partial<AppSettings>, msg: string) {
    await saveSettings(patch);
    flash(msg);
  }

  async function resetAll() {
    if (!confirmReset) {
      confirmReset = true;
      return;
    }
    await db.transaction(
      'rw',
      [db.games, db.milestones, db.sessions, db.backtrackNotes, db.platforms, db.genres],
      async () => {
        await db.games.clear();
        await db.milestones.clear();
        await db.sessions.clear();
        await db.backtrackNotes.clear();
        await db.platforms.clear();
        await db.genres.clear();
      }
    );
    confirmReset = false;
    flash('Toutes les données locales ont été supprimées.');
  }
</script>

<div class="page-head">
  <h1>⚙️ Paramètres</h1>
</div>

{#if notice}<div class="notice ok">{notice}</div>{/if}

<div class="panel">
  <h2>Anti-spoiler & affichage</h2>
  <div class="setting-row">
    <div>
      <div>Brouillard de guerre sur les jalons</div>
      <div class="desc">Les jalons futurs restent masqués (« Étape X — ??? ») jusqu'à la validation du précédent.</div>
    </div>
    <input
      type="checkbox"
      checked={settings.fogOfWarEnabled}
      on:change={(e) => toggle({ fogOfWarEnabled: (e.currentTarget as HTMLInputElement).checked }, 'Brouillard de guerre mis à jour.')}
    />
  </div>
  <div class="setting-row">
    <div>
      <div>Afficher l'estimation du temps restant</div>
      <div class="desc">Croise le temps joué et les jalons validés avec la durée moyenne du jeu. Désactivée par défaut.</div>
    </div>
    <input
      type="checkbox"
      checked={settings.showRemainingTime}
      on:change={(e) => toggle({ showRemainingTime: (e.currentTarget as HTMLInputElement).checked }, 'Option mise à jour.')}
    />
  </div>
  <div class="setting-row">
    <div>
      <div>L'export Markdown respecte le brouillard de guerre</div>
      <div class="desc">Les jalons verrouillés restent masqués dans le fichier Markdown exporté.</div>
    </div>
    <input
      type="checkbox"
      checked={settings.exportRespectsFogOfWar}
      on:change={(e) => toggle({ exportRespectsFogOfWar: (e.currentTarget as HTMLInputElement).checked }, 'Option mise à jour.')}
    />
  </div>
</div>

<div class="panel">
  <h2>Données</h2>
  <p class="muted" style="font-size:.9rem;">
    Toutes les données vivent uniquement dans ce navigateur (IndexedDB). Utilisez la page
    <a href="/io" style="color:var(--accent)">Import / Export</a> pour sauvegarder ou restaurer un JSON complet.
  </p>
  <button class="btn danger" on:click={resetAll}>
    {confirmReset ? '⚠️ Confirmer la suppression de TOUTES les données' : 'Supprimer toutes les données locales'}
  </button>
</div>
