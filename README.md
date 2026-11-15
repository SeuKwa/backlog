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

## Commandes

```bash
npm install
npm run dev      # développement
npm run build    # build de prod (PWA) dans build/
npm run check    # svelte-check
npm test         # tests unitaires du domaine (vitest)
npm run icons    # régénère les icônes PNG du manifest
```
