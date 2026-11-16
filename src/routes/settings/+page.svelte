<script lang="ts">
  import { onMount } from 'svelte';
  import { settings$ } from '$lib/stores/app';
  import { db } from '$lib/storage/db';
  import { getSettings, saveSettings } from '$lib/storage/repositories';
  import { storeSecret } from '$lib/storage/crypto';
  import { DEFAULT_SETTINGS, type AppSettings } from '$lib/domain/types';

  let settings: AppSettings = DEFAULT_SETTINGS;
  let confirmReset = false;
  let notice = '';
  let error = '';

  let metadataProvider: 'igdb' | 'rawg' = 'igdb';
  let rawgKey = '';
  let igdbClientId = '';
  let igdbClientSecret = '';

  let llmBaseUrl = 'https://api.mistral.ai/v1';
  let llmModel = '';
  let llmKey = '';

  let steamApiKey = '';
  let steamId = '';
  let raUsername = '';
  let raApiKey = '';

  onMount(() => {
    const sub = settings$.subscribe(async (v) => {
      if (v) {
        settings = v;
        metadataProvider = v.metadata?.provider ?? 'igdb';
        llmBaseUrl = v.llm?.baseUrl ?? 'https://api.mistral.ai/v1';
        llmModel = v.llm?.model ?? '';
        steamId = v.playtime?.steamId ?? '';
        raUsername = v.playtime?.raUsername ?? '';
      }
    });
    return () => sub.unsubscribe();
  });

  function flash(msg: string) {
    notice = msg;
    error = '';
    setTimeout(() => (notice = ''), 3000);
  }

  async function toggle(patch: Partial<AppSettings>, msg: string) {
    await saveSettings(patch);
    flash(msg);
  }

  async function saveMetadata() {
    error = '';
    try {
      const current = await getSettings();
      const md = { ...(current.metadata ?? { provider: metadataProvider as 'igdb' | 'rawg' }) };
      md.provider = metadataProvider;
      if (rawgKey.trim()) md.apiKeyHandle = await storeSecret(rawgKey.trim());
      if (igdbClientId.trim()) md.clientIdHandle = await storeSecret(igdbClientId.trim());
      if (igdbClientSecret.trim()) md.clientSecretHandle = await storeSecret(igdbClientSecret.trim());
      if (md.provider === 'rawg' && !md.apiKeyHandle) throw new Error('Renseignez la clé API RAWG.');
      if (md.provider === 'igdb' && (!md.clientIdHandle || !md.clientSecretHandle)) {
        throw new Error('Renseignez le Client ID et le Client Secret Twitch pour IGDB.');
      }
      await saveSettings({ metadata: md });
      rawgKey = '';
      igdbClientId = '';
      igdbClientSecret = '';
      flash('Métadonnées enregistrées (clés chiffrées localement).');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function saveLlm() {
    error = '';
    try {
      const current = await getSettings();
      if (!llmModel.trim()) throw new Error('Le modèle est requis (ex. : mistral-large-latest).');
      const apiKeyHandle = llmKey.trim()
        ? await storeSecret(llmKey.trim())
        : current.llm?.apiKeyHandle ?? '';
      if (!apiKeyHandle) throw new Error('La clé API est requise.');
      await saveSettings({
        llm: { baseUrl: llmBaseUrl.trim() || 'https://api.mistral.ai/v1', model: llmModel.trim(), apiKeyHandle }
      });
      llmKey = '';
      flash('LLM enregistré (clé chiffrée localement, jamais envoyée ailleurs que vers baseUrl).');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function savePlaytime() {
    error = '';
    try {
      const current = await getSettings();
      const p = { ...(current.playtime ?? {}) };
      p.steamId = steamId.trim() || undefined;
      p.raUsername = raUsername.trim() || undefined;
      if (steamApiKey.trim()) p.steamApiKeyHandle = await storeSecret(steamApiKey.trim());
      if (raApiKey.trim()) p.raApiKeyHandle = await storeSecret(raApiKey.trim());
      await saveSettings({ playtime: p });
      steamApiKey = '';
      raApiKey = '';
      flash('Steam / RetroAchievements enregistrés (clés chiffrées localement).');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function resetAll() {
    if (!confirmReset) {
      confirmReset = true;
      return;
    }
    await db.transaction(
      'rw',
      [db.games, db.milestones, db.sessions, db.backtrackNotes, db.platforms, db.genres, db.covers],
      async () => {
        await db.games.clear();
        await db.milestones.clear();
        await db.sessions.clear();
        await db.backtrackNotes.clear();
        await db.platforms.clear();
        await db.genres.clear();
        await db.covers.clear();
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
{#if error}<div class="notice error">{error}</div>{/if}

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
  <h2>Métadonnées jeux (BYOK)</h2>
  <p class="muted" style="font-size:.9rem;">
    Remplit automatiquement les fiches (titre, plateformes, genres, jaquette). Les identifiants sont chiffrés
    localement (AES-GCM via WebCrypto) et ne quittent jamais l'appareil.
  </p>
  <div class="form-row">
    <label class="field">
      <span>Fournisseur</span>
      <select bind:value={metadataProvider}>
        <option value="igdb">IGDB (nécessite Client ID + Secret Twitch)</option>
        <option value="rawg">RAWG (clé API, fallback)</option>
      </select>
    </label>
    {#if metadataProvider === 'rawg'}
      <label class="field">
        <span>Clé API RAWG {settings.metadata?.apiKeyHandle ? '✓ configurée' : ''}</span>
        <input type="password" bind:value={rawgKey} placeholder="laisser vide pour conserver" autocomplete="off" />
      </label>
    {:else}
      <label class="field">
        <span>Client ID Twitch {settings.metadata?.clientIdHandle ? '✓ configuré' : ''}</span>
        <input type="password" bind:value={igdbClientId} placeholder="laisser vide pour conserver" autocomplete="off" />
      </label>
      <label class="field">
        <span>Client Secret Twitch {settings.metadata?.clientSecretHandle ? '✓ configuré' : ''}</span>
        <input type="password" bind:value={igdbClientSecret} placeholder="laisser vide pour conserver" autocomplete="off" />
      </label>
    {/if}
  </div>
  <div class="actions-row">
    <button class="btn primary sm" on:click={saveMetadata}>Enregistrer</button>
  </div>
</div>

<div class="panel">
  <h2>LLM — génération de jalons (BYOK)</h2>
  <p class="muted" style="font-size:.9rem;">
    Endpoint compatible OpenAI (Mistral, OpenRouter, OpenAI…). Génère 8 à 12 jalons neutres anti-spoiler,
    proposés en brouillon éditable avant validation.
  </p>
  <div class="form-row">
    <label class="field">
      <span>Base URL</span>
      <input type="text" bind:value={llmBaseUrl} placeholder="https://api.mistral.ai/v1" />
    </label>
    <label class="field">
      <span>Modèle</span>
      <input type="text" bind:value={llmModel} placeholder="mistral-large-latest" />
    </label>
  </div>
  <label class="field">
    <span>Clé API {settings.llm?.apiKeyHandle ? '✓ configurée' : ''}</span>
    <input type="password" bind:value={llmKey} placeholder="laisser vide pour conserver" autocomplete="off" />
  </label>
  <div class="actions-row">
    <button class="btn primary sm" on:click={saveLlm}>Enregistrer</button>
  </div>
</div>

<div class="panel">
  <h2>Steam / RetroAchievements (BYOK)</h2>
  <p class="muted" style="font-size:.9rem;">
    Synchronise le temps de jeu Steam et les succès RetroAchievements sur les fiches liées
    (appid Steam renseigné automatiquement via RAWG/IGDB quand disponible).
  </p>
  <div class="form-row">
    <label class="field">
      <span>Clé API Steam (Web API) {settings.playtime?.steamApiKeyHandle ? '✓ configurée' : ''}</span>
      <input type="password" bind:value={steamApiKey} placeholder="laisser vide pour conserver" autocomplete="off" />
    </label>
    <label class="field">
      <span>Steam ID (17 chiffres)</span>
      <input type="text" bind:value={steamId} placeholder="765611980…" inputmode="numeric" />
    </label>
  </div>
  <div class="form-row">
    <label class="field">
      <span>Nom d'utilisateur RA</span>
      <input type="text" bind:value={raUsername} placeholder="votre pseudo RetroAchievements" />
    </label>
    <label class="field">
      <span>Clé API RA (Web API) {settings.playtime?.raApiKeyHandle ? '✓ configurée' : ''}</span>
      <input type="password" bind:value={raApiKey} placeholder="laisser vide pour conserver" autocomplete="off" />
    </label>
  </div>
  <div class="actions-row">
    <button class="btn primary sm" on:click={savePlaytime}>Enregistrer</button>
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
