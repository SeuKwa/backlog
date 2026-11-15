<script lang="ts">
  import { db } from '$lib/storage/db';
  import { downloadText, exportAll, importAll } from '$lib/storage/backup';
  import { getSettings } from '$lib/storage/repositories';
  import { libraryToMarkdown } from '$lib/domain/export/markdown';
  import { importPlayniteFile } from '$lib/services/playniteImport';
  import type { Milestone } from '$lib/domain/types';

  let message = '';
  let error = '';

  function flash(msg: string) {
    message = msg;
    error = '';
    setTimeout(() => (message = ''), 4000);
  }

  async function doExportJson() {
    const exp = await exportAll();
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`backlog-${date}.json`, JSON.stringify(exp, null, 2));
    flash('Export JSON téléchargé (données complètes, non masquées).');
  }

  async function doExportMarkdown() {
    const games = await db.games.toArray();
    const allMilestones = await db.milestones.toArray();
    const byGame = new Map<string, Milestone[]>();
    for (const m of allMilestones) {
      const arr = byGame.get(m.gameId) ?? [];
      arr.push(m);
      byGame.set(m.gameId, arr);
    }
    const settings = await getSettings();
    const md = libraryToMarkdown(games, byGame, { respectFog: settings.exportRespectsFogOfWar });
    downloadText('backlog.md', md, 'text/markdown');
    flash('Export Markdown téléchargé.');
  }

  async function onPlayniteFile(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    error = '';
    try {
      const res = await importPlayniteFile(file.name, await file.text());
      flash(`Playnite : ${res.total} jeu(x) lus — ${res.created} créé(s), ${res.updated} mis à jour.`);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      input.value = '';
    }
  }

  async function onImportFile(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    error = '';
    try {
      const data = JSON.parse(await file.text());
      const res = await importAll(data, 'replace');
      flash(`${res.games} jeu(x) importé(s) — la bibliothèque a été remplacée.`);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      input.value = '';
    }
  }
</script>

<div class="page-head">
  <h1>Import / Export</h1>
</div>

{#if message}<div class="notice ok">{message}</div>{/if}
{#if error}<div class="notice error">{error}</div>{/if}

<div class="panel">
  <h2>Export</h2>
  <p class="muted" style="font-size:.9rem;">
    Le JSON contient <strong>toutes</strong> vos données (souveraineté totale, y compris les jalons masqués).
    Le Markdown est le format lisible/partageable : par défaut, les jalons verrouillés y restent masqués.
  </p>
  <div class="actions-row">
    <button class="btn primary" on:click={doExportJson}>⬇ Export JSON complet</button>
    <button class="btn" on:click={doExportMarkdown}>⬇ Export Markdown</button>
  </div>
</div>

<div class="panel">
  <h2>Import Playnite</h2>
  <p class="muted" style="font-size:.9rem;">
    Export JSON (clé « games ») ou CSV de Playnite : crée les jeux manquants et met à jour temps de jeu,
    plateformes et genres (correspondance par Id Playnite, sinon par titre).
  </p>
  <label class="field">
    <span>Fichier Playnite (.json ou .csv)</span>
    <input type="file" accept=".json,.csv,application/json,text/csv" on:change={onPlayniteFile} />
  </label>
</div>

<div class="panel">
  <h2>Import</h2>
  <p class="muted" style="font-size:.9rem;">
    Restaure un export JSON. <strong>Attention :</strong> l'import remplace la bibliothèque actuelle.
  </p>
  <label class="field">
    <span>Fichier JSON d'export</span>
    <input type="file" accept="application/json,.json" on:change={onImportFile} />
  </label>
</div>
