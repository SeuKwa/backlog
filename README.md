# Backlog

Application personnelle **local-first** de gestion de backlog de jeux vidéo, centrée sur le
**suivi de progression sans spoiler** (brouillard de guerre sur les jalons) et la **reprise de
partie facilitée** (marque-page épinglée, check-in rapide).

- **Zéro spoiler par conception** : les jalons futurs sont masqués (`Étape X — ???`) et ne se
  déverrouillent qu'à la validation du jalon précédent. L'export Markdown respecte ce masquage.
- **Souveraineté des données** : 100 % local (IndexedDB via Dexie.js), export/import complet en
  JSON, export lisible en Markdown. Aucun serveur obligatoire.
- **PWA installable** : fonctionne offline après le premier chargement.

## Stack

SvelteKit (adapter-static, SPA) + TypeScript + Dexie.js (IndexedDB) + vite-plugin-pwa.

Architecture en couches (`src/lib`) :

```
domain/     types, règles métier pures (fog of war, statuts, estimations, picker), export JSON/Markdown
storage/    schéma Dexie, repositories, sauvegarde/restauration JSON
connectors/ (V1+) adaptateurs externes derrière des interfaces (IGDB/RAWG, Playnite, LLM BYOK)
services/   orchestration (quick check-in, validation de jalon, ...)
stores/     stores réactifs (liveQuery Dexie)
ui/         composants
```

## Fonctionnalités (Jalon 2)

- **Métadonnées BYOK** : recherche IGDB (Client ID/Secret Twitch) ou RAWG (clé API) depuis la bibliothèque ;
  la fiche est pré-remplie et la jaquette est téléchargée puis stockée en blob local (fonctionne offline).
  Les identifiants sont chiffrés en AES-GCM (WebCrypto) dans IndexedDB.
- **Génération LLM de jalons (BYOK)** : endpoint compatible OpenAI (Mistral/OpenRouter/…), prompt système
  strict anti-spoiler, jalons proposés en **brouillon éditable** avant ajout (source `llm`).
- **Import Playnite** (JSON `games` ou CSV) : crée/met à jour les jeux (temps de jeu, plateformes, genres).
- **Carnet de backtracking** par jeu (lieux / coffres / quêtes bloqués, résolubles).
- **Durées de référence HLTB** sur la fiche + estimation du temps restant (opt-in).
- **Hooks Steam Web API / RetroAchievements (BYOK)** (Jalon 3) : appid Steam extrait automatiquement des
  métadonnées (RAWG `stores`, IGDB `external_games`), id RA saisissable sur la fiche ; bouton « Synchroniser »
  → temps de jeu Steam (max local/Steam) et succès RA enregistrés sur la fiche. Clés chiffrées (AES-GCM).
- **Dashboard de stats** (`/stats`) : temps total, par mois / genre / plateforme / statut, jalons validés,
  durée moyenne de session — 100 % local, calcul pur dans `domain/stats.ts`.

- **HowLongToBeat (BYOK)** : clé API HLTB en paramètres → à la création d'un jeu via IGDB/RAWG,
  les durées (histoire principale / complétionniste) sont pré-remplies automatiquement ; bouton
  « Rechercher la durée » sur la fiche pour (re)remplir manuellement.
- **Synchro multi-appareils sans serveur** : package chiffré AES-256-GCM (PBKDF2 210k itérations, phrase de
  passe) en export/import `.json.enc` — transférez le fichier comme vous voulez, local-first préservé.

## Déploiement GitHub Pages

Un workflow `deploy.yml` déploie le build sur GitHub Pages à chaque push sur `main` :

1. Rendre le dépôt **public** (Settings → Danger Zone) — Pages public exige un dépôt public
   (sinon, Pages privé = plan payant).
2. Settings → Pages → Source : **GitHub Actions**.
3. Merger la PR contenant `deploy.yml` : le workflow build avec `BASE_PATH=/<nom-du-repo>`
   (project page), copie `build/200.html` en `build/404.html` (fallback SPA) et publie.

L'app est alors servie en statique ; les données restent 100 % locales (IndexedDB du navigateur).

## Commandes

```bash
npm install
npm run dev      # développement
npm run build    # build de prod (PWA) dans build/
npm run check    # svelte-check
npm test         # tests unitaires (vitest)
npm run test:e2e # tests E2E Playwright (nécessite `npx playwright install chromium`)
npm run icons    # régénère les icônes PNG du manifest
```
