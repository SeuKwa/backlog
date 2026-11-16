<script lang="ts">
  import { db } from '$lib/storage/db';
  import { downloadText, exportAll, importAll } from '$lib/storage/backup';
  import { getSettings } from '$lib/storage/repositories';
  import { libraryToMarkdown } from '$lib/domain/export/markdown';
  import { importPlayniteFile } from '$lib/services/playniteImport';
  import { exportEncryptedPackage, importEncryptedPackage } from '$lib/services/sync';
  import type { Milestone } from '$lib/domain/types';

  let message = '';
  let error = '';

  let syncPass = '';
  let syncImportPass = '';
  let encFileText = '';
  let encFileName = '';

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

  async function doExportEncrypted() {
    error = '';
    try {
      const payload = await exportEncryptedPackage(syncPass);
      const date = new Date().toISOString().slice(0, 10);
      downloadText(`backlog-sync-${date}.json.enc`, payload, 'application/json');
      syncPass = '';
      flash('Package chiffré téléchargé — à transférer vous-même (clé USB, cloud perso, message…).');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  function onEncFile(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    encFileName = file.name;
    void file.text().then((t) => (encFileText = t));
  }

  async function doImportEncrypted() {
    error = '';
    if (!encFileText) {
      error = 'Choisissez d’abord un fichier package chiffré.';
      return;
    }
    try {
      const res = await importEncryptedPackage(encFileText, syncImportPass);
      syncImportPass = '';
      encFileText = '';
      encFileName = '';
      flash(`Package déchiffré : ${res.games} jeu(x) importé(s) — bibliothèque remplacée.`);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
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
  <h2>🔐 Package chiffré (synchro entre appareils, sans serveur)</h2>
  <p class="muted" style="font-size:.9rem;">
    Exporte toute la bibliothèque dans un fichier chiffré AES-256-GCM (PBKDF2, 210 000 itérations) protégé par
    une phrase de passe. Le fichier ne peut être déchiffré qu’avec cette phrase : transférez-le comme vous voulez
    (cloud perso, clé USB, message) puis importez-le sur l’autre appareil. <strong>L’import remplace la bibliothèque.</strong>
  </p>
  <div class="form-row">
    <label class="field">
      <span>Phrase de passe (8 caractères min.)</span>
      <input type="password" bind:value={syncPass} placeholder="pour l’export chiffré" autocomplete="new-password" />
    </label>
  </div>
  <div class="actions-row">
    <button class="btn primary" on:click={doExportEncrypted} disabled={syncPass.length < 8}>
      ⬇ Export chiffré (.json.enc)
    </button>
  </div>
  <hr style="border-color:var(--border); margin:1rem 0;" />
  <div class="form-row">
    <label class="field">
      <span>Fichier package (.json.enc)</span>
      <input type="file" accept=".json.enc,.json,application/json" on:change={onEncFile} />
    </label>
    <label class="field">
      <span>Phrase de passe</span>
      <input type="password" bind:value={syncImportPass} placeholder="pour l’import chiffré" autocomplete="off" />
    </label>
  </div>
  <div class="actions-row">
    <button class="btn primary" on:click={doImportEncrypted} disabled={!encFileText || !syncImportPass}>
      ⬆ Import chiffré{encFileName ? ` (${encFileName})` : ''}
    </button>
  </div>
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
