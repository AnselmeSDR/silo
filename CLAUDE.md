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

Stocks (`packages/engine/src/stocks`) : `createStocks`, `addStock` (nœud, type, capacité, perte par pas),
`deposit`/`withdraw`/`lose`/`transfer` (bornés par le libre et la place, manque consigné dans `totals.shortage`),
`reserve`/`releaseReservation`/`consumeReservation` (la quantité réservée reste dans `available` mais n'est plus
libre), `verifyStocks` (bilan par stock et par type), `stocksSystem` (à placer en dernier : pertes, contrôle, ouverture
du pas suivant). Les transferts ne vérifient pas l'accessibilité spatiale.

Production (`packages/engine/src/production`) : fiches `PRODUCTION_SHEETS` (traitement de l'eau, culture
hydroponique, turbine : intrants, sortie, durée, équipement, métier, opérateurs, capacité en lots parallèles),
`addMachine` (câble une fiche à ses stocks), `productionSystem` (avant `stocksSystem`) : une machine n'avance
que si l'équipement marche et que les opérateurs requis sont en présence productive avec une compétence réelle > 0 ;
un lot ne démarre que si tous les intrants sont libres, il les consomme aussitôt ; sans opérateur les lots en cours
sont en pause. `explainMachine` / `explainStock` expliquent flux et blocages (`totals.blockedSteps`).
Branché dans le scénario : `config.production` (optionnel, `{ sheetId, sector }[]`, validé par `loadScenario`) ;
`createWorld` crée un stock localisé par ressource (secteur de stockage fixe, capacité = 2 × stock initial), installe
chaque ligne dans le premier local de son secteur et l'équipe de 3 équipes à relais d'habitants disponibles, posés
sur place (le trajet domicile-travail n'est pas simulé). Ordre des systèmes : production, déplacements, stocks.

Observation et headless : `createWorld(config)` / `createScenarioSimulation(config)` (`world/`) assemblent
l'état (spatial, population, mouvement, stocks, production). Le `Summary` expose aussi `production`
(produit/consommé par ressource, état des machines). `createObserver(sim)` (`observation/`) est l'unique accès en
lecture pour le rendu (`Observer` : copies simples, `summary()`) ; `packages/render` n'importe que ce type.
`runHeadless(config, days)` + CLI : `pnpm engine [scenario.json] [--days N]` affiche le résumé final.

Rendu du puits (`packages/render/src/shaft`) : `createShaftLayout(config)` (cotes D-08 `SHAFT_DIMENSIONS`, niveaux,
angles d'artères, hélice de l'escalier, pont alterné 0°/180°, pur et testé) et `buildShaft(config)` (`Group` Three.js :
noyau, escalier en éventail instancié à parapets pleins continus, paliers annulaires, passerelles, artères). Décor
statique, matières mates désaturées (D-05) ; `main.ts` l'affiche pour `starterSilo`.

Besoins (`packages/engine/src/needs`) : `createNeeds({ count, seed })` (jauges entières 0–10 000 pour eau,
nourriture, sommeil, santé ; traits individuels `metabolism` et `resilience`), `needsSystem` (`System<NeedsWorld>`, à
placer avant `movementSystem`, `stocksSystem` en dernier). L'eau et la nourriture se consomment dans un stock réel du
nœud où se trouve l'habitant (`withdraw`) ; sinon il est `seeking` et, si `movement`/`spatial` sont dans le monde, part
vers un stock non vide. `productivityFactor` (0–1, à multiplier par `effectiveness`), `incapacitated` (seuil selon la
résilience) et, si `profiles` est fourni, `absentUntilStep`. La santé baisse quand eau ou nourriture est à 0 (statut
`ill` avec hystérésis), sans mort à ce stade.

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
