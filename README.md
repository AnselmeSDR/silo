# Silo

Simulation de silos post-apocalyptiques. Concept : `concept-simulation-silos-post-apocalyptiques.md` ;
décisions techniques : `docs/decisions.md`.

## Structure

pnpm workspace, TypeScript strict partout.

| Paquet            | Rôle                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `packages/engine` | Moteur de simulation, sans DOM ni Three.js (Node et Web Worker)        |
| `packages/render` | Rendu (Three.js), lit uniquement l'état exposé par le moteur           |
| `packages/tools`  | Outils : simulations sans affichage, mesures, scripts de développement |

## Installation

Prérequis : Node ≥ 22 et pnpm (`corepack enable`).

```sh
pnpm install
```

## Scripts

| Commande            | Effet                                              |
| ------------------- | -------------------------------------------------- |
| `pnpm check`        | Format (vérif.), lint et typecheck en une commande |
| `pnpm lint`         | ESLint sur tout le dépôt                           |
| `pnpm format`       | Prettier : reformate les fichiers                  |
| `pnpm format:check` | Prettier : vérifie sans modifier                   |
| `pnpm typecheck`    | `tsc` strict dans chaque paquet                    |

## Licence

GNU GPL v3 (`LICENSE`).
