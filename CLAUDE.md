# Silo

Simulation de silos post-apocalyptiques : concept (`concept-simulation-silos-post-apocalyptiques.md`),
maquettes (`maquettes/`), tickets suivis par po-watcher (`docs/tickets`).

## Code

pnpm workspace TypeScript strict : `packages/engine` (moteur, sans DOM), `packages/render` (Three.js),
`packages/tools`. Commandes : `pnpm install`, `pnpm check` (format + lint + typecheck), `pnpm lint`,
`pnpm format`, `pnpm typecheck`. Lancer `pnpm check` avant de commiter.
`pnpm dev` (Vite, scène Three.js vide), `pnpm build` (render + engine), `pnpm engine` (moteur sans rendu,
après build). Three.js figé en version exacte (0.160.0, comme les maquettes).

## Stack et structure

TypeScript strict, pnpm workspace, Three.js 0.160.0 (rendu), Vite (dev). Le moteur (`packages/engine`) n'a
aucune dépendance au DOM ni à Three.js : Node pour les essais, Web Worker pour le jeu ; le rendu
(`packages/render`) ne lit que l'état exposé. Pas fixe d'1 min simulée, déterministe (graine + un flux PRNG
par système), sauvegarde JSON versionnée. Code jetable : dossiers `proto/` (ne pas réutiliser).

## Décisions

`docs/decisions.md` : index D-01 à D-08 (une entrée par décision) et décisions encore ouvertes. À lire avant
de toucher moteur, rendu, sauvegarde ou unités ; à mettre à jour quand une décision change.

## Git

Identité `Anselme SDR <anselme8@icloud.com>` (config du dépôt). Dépôts publics, compte AnselmeSDR :
https://gitlab.com/AnselmeSDR/silo (principal) et https://github.com/AnselmeSDR/silo (miroir). Double
push en SSH : `origin` a deux URL de push, un `git push` envoie aux deux. Commits en Conventional
Commits anglais sans scope.

## Licence

Copyright © 2026 Anselme SDR. GNU GPL v3 (`LICENSE`) : réutilisable, à condition de citer l'auteur et
de publier toute version dérivée sous la même licence.
