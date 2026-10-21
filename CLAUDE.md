# Silo

Simulation de silos post-apocalyptiques : concept (`concept-simulation-silos-post-apocalyptiques.md`),
maquettes (`maquettes/`), tickets suivis par po-watcher (`docs/tickets`).

## Code

pnpm workspace TypeScript strict : `packages/engine` (moteur, sans DOM), `packages/render` (Three.js),
`packages/tools`. Commandes : `pnpm install`, `pnpm check` (format + lint + typecheck), `pnpm lint`,
`pnpm format`, `pnpm typecheck`. Lancer `pnpm check` avant de commiter.

## Git

Identité `Anselme SDR <anselme8@icloud.com>` (config du dépôt). Dépôts publics, compte AnselmeSDR :
https://gitlab.com/AnselmeSDR/silo (principal) et https://github.com/AnselmeSDR/silo (miroir). Double
push en SSH : `origin` a deux URL de push, un `git push` envoie aux deux. Commits en Conventional
Commits anglais sans scope.

## Licence

Copyright © 2026 Anselme SDR. GNU GPL v3 (`LICENSE`) : réutilisable, à condition de citer l'auteur et
de publier toute version dérivée sous la même licence.
