# Silo

Simulation de silos post-apocalyptiques.

## Origine et mode de développement

Le projet est réalisé à partir du document de concept [concept-simulation-silos-post-apocalyptiques.md](concept-simulation-silos-post-apocalyptiques.md), fourni par le PO.

Le développement est mené en autonomie par po-watcher et ses agents.

Décisions techniques : `docs/decisions.md`.

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

[AGPL-3.0](LICENSE) — libre d'utiliser, de modifier et de partager ; toute version modifiée, distribuée ou proposée en ligne doit rester open source sous la même licence. Une licence commerciale est disponible pour un usage en code fermé : anselme8@icloud.com.
