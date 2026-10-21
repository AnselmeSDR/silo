# Décisions techniques

## D-01 — Stack du moteur et plateforme cible (SIL-01)

- **Langage et runtime** : TypeScript partout (moteur, rendu, outils). Un seul langage, typage strict pour les 2 000 entités persistantes, et Three.js (§15) est déjà en TypeScript/JavaScript.
- **Plateforme cible** : application web (navigateur) d'abord ; empaquetage bureau (Tauri ou Electron) envisagé ensuite, sans changer le code.
- **Séparation moteur/rendu** : le moteur est un paquet séparé, sans dépendance au DOM ni à Three.js. Il s'exécute dans Node pour les essais sans affichage (tests, mesures de performance, simulations longues) et dans un Web Worker pour le jeu, afin de ne pas bloquer le rendu. Le rendu ne lit que l'état exposé par le moteur.
- **À mesurer** : le budget de performance à 2 000 individus (§15.3) reste à valider par des mesures ; si TypeScript s'avère insuffisant sur un point chaud, il sera isolé (WebAssembly) sans remettre en cause la décision.

## D-02 — Pas de simulation, ordre de résolution, déterminisme

Réf. concept §15.4, §16.2 · ticket SIL-02.

### Pas et échelle de temps

- Pas fixe : **1 pas = 1 minute simulée**. Le pas ne varie jamais (ni selon la vitesse de jeu, ni selon la caméra, ni selon la charge).
- Échelle à vitesse ×1 : **1 s réelle = 1 pas = 1 min simulée** (1 jour simulé = 24 min réelles).
- La vitesse de jeu (pause, ×1, ×2, ×4, ×8…) ne change que le nombre de pas exécutés par seconde réelle, jamais la durée d'un pas.
- Si le matériel ne suit pas, la simulation ralentit (moins de pas par seconde réelle) ; elle ne saute ni n'agrège aucun pas.
- Le rendu est découplé : il interpole entre deux pas et n'influence aucun calcul.

### Ordre de résolution

- Les systèmes s'exécutent dans un **ordre fixe et documenté** à chaque pas (liste unique dans le moteur).
- Au sein d'un système, l'ordre des habitants est **mélangé à chaque pas** par le PRNG du système (Fisher-Yates), sans clé de tri ni priorité : aucun habitant n'est favorisé par son identifiant, son rang ou son ancienneté.
- Les effets d'un pas sont lus sur l'état au début du pas pour les décisions concurrentes ; les conflits (ex. une ressource convoitée par plusieurs) sont tranchés par tirage du PRNG du système, jamais par l'ordre de parcours.
- Les calculs ne dépendent ni de la caméra, ni de ce qui est visible, ni du temps réel.

### PRNG

- **Une graine maîtresse** par partie (entier 64 bits), consignée dans la fiche d'expérience.
- **Un flux indépendant par système** (déplacement, besoins, social, événements, etc.), dérivé de la graine maîtresse et du nom stable du système : ajouter ou retirer un système ne décale pas les autres flux.
- Générateur à état compact et sérialisable (famille PCG ou xoshiro, implémentation portable, pas de `Math.random`).
- **L'état de chaque flux est sauvegardé** avec la partie : recharger puis continuer donne exactement la même suite qu'une partie ininterrompue.
- Les entrées externes (interventions du joueur, Voix IA) sont journalisées avec le numéro de pas auquel elles s'appliquent, pour rejouer une partie à l'identique.

### Limite

Une graine seule ne garantit pas la reproductibilité si la version du moteur, les règles ou l'ordre des systèmes changent (§16.2) : ces versions font partie de la fiche d'expérience.

## D-03 — Budget de performance et matériel cible (SIL-03)

Statut : provisoire, à confirmer par le prototype SIL-12. Source : concept §15.4.

### Matériel de référence

MacBook Pro Apple M2 Pro (CPU 10 cœurs), 16 Go de RAM, macOS, navigateur à jour, sur secteur, sans autre charge. Toute mesure indique la machine utilisée ; un autre matériel ne remplace pas la référence.

### Budget

| Mesure | Cible (p95) | Plafond (p99) |
| --- | --- | --- |
| Pas moteur, 2 000 entités | ≤ 10 ms | ≤ 14 ms |
| Image de rendu, habitants instanciés | ≤ 16,6 ms (60 images/s) | ≤ 20 ms |

Les 2 000 entités sont un objectif fonctionnel, pas une preuve : seule la mesure sur le matériel de référence fait foi.

### Méthode de mesure

- Script reproductible versionné (livré avec SIL-12), une commande, sortie JSON.
- Graine fixe du générateur aléatoire, scénario identique à chaque exécution.
- 5 s d'échauffement écartées, puis 60 s mesurées ; 3 exécutions, on retient la médiane.
- Moteur mesuré seul (sans rendu), puis rendu seul, puis les deux ensemble.
- Relevé : p50, p95, p99 et maximum par pas et par image ; échec si le p95 dépasse la cible.

### Si le budget n'est pas tenu

Réduire d'abord le coût par entité (fréquence de mise à jour par priorité) ; l'objectif de 2 000 entités ne change que sur décision du PO.
