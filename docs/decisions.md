# Décisions techniques

## D-01 — Stack du moteur et plateforme cible (SIL-01)

- **Langage et runtime** : TypeScript partout (moteur, rendu, outils). Un seul langage, typage strict pour les 2 000 entités persistantes, et Three.js (§15) est déjà en TypeScript/JavaScript.
- **Plateforme cible** : application web (navigateur) d'abord ; empaquetage bureau (Tauri ou Electron) envisagé ensuite, sans changer le code.
- **Séparation moteur/rendu** : le moteur est un paquet séparé, sans dépendance au DOM ni à Three.js. Il s'exécute dans Node pour les essais sans affichage (tests, mesures de performance, simulations longues) et dans un Web Worker pour le jeu, afin de ne pas bloquer le rendu. Le rendu ne lit que l'état exposé par le moteur.
- **À mesurer** : le budget de performance à 2 000 individus (§15.3) reste à valider par des mesures ; si TypeScript s'avère insuffisant sur un point chaud, il sera isolé (WebAssembly) sans remettre en cause la décision.
