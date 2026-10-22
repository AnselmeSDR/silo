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

Modèle spatial (`packages/engine/src/spatial`) : graphe non orienté à ids numériques (palier, jonction de
coursive, nœud d'artère, local), cotes et temps de D-08 ; `buildSpatialModel({ levels, arteriesPerLevel })`,
`findPath` (Dijkstra, ms), `unreachableLevels`. Un local « inaccessible » est exclu des trajets. `revision` du modèle (incrémentée par `setServiceState`) invalide les routes.

Déplacements (`packages/engine/src/movement`) : `createMovement`, `requestTrip(world, id, destination)`,
`movementSystem` (`System<MovementWorld>`). Trajet = route du graphe parcourue arête par arête (60 s par pas),
capacité par pas et par type de passage (file d'attente si saturé), routes en cache jusqu'au changement de
`revision` ; la congestion ne déclenche aucun recalcul.

Scénario (`packages/engine/src/scenario`) : `loadScenario(json)` valide (toutes les erreurs listées, `ScenarioError`) une
config versionnée (population, topologie, secteurs par niveau/artère, stocks en sous-unités D-06) ;
`SECTOR_CATALOG` (17 secteurs du §3.4) ; `starterSilo` (24 niveaux × 4 artères, 2 000 habitants,
2 400 lits). Chaque artère de chaque niveau a exactement un secteur. `buildScenarioModel(config)` construit
le modèle spatial ; `buildSpatialModel` remplit la capacité de chaque local depuis `roomCapacity` (option, défaut
`DEFAULT_ROOM_CAPACITY` = 2) ; la population lit `capacity` sur le local.

Travail (`packages/engine/src/work`) : catalogue `PROFESSIONS` (25 métiers du §5.2.1 en données, lieux = types de secteur du catalogue SIL-16, `sectorOfRoom`),
`createAssignment` (lieu + métier + `Shift`), `planDay` / `phaseAt` (trajet, prise de poste, travail, pause,
relève, retour), `relayShifts` (équipes à relais), `availableWorkforce` (main-d'œuvre ≠ population),
`isProductive` (une absence ou un trajet bloqué n'est jamais une présence productive), `effectiveness`
(fonction attribuée ≠ compétence réelle ≠ volonté).

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
