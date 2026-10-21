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

## D-03 — Échelle du temps, unités de ressources et démographie initiale

Réf. concept §4.3, §7.1 · ticket SIL-07. Complète D-02 (pas fixe d'1 minute simulée).

### Échelle du temps

- **1 jour simulé = 1 440 pas** (24 h × 60 min), 1 pas = 1 min simulée.
- Calendrier simplifié : **1 an = 360 jours** (12 mois de 30 jours), sans bissextile ni saisons au départ. Un pas de simulation est un entier, le temps simulé en est dérivé (`jour = pas / 1440`).
- **Vitesses de lecture** : pause, ×1, ×10, ×100. À ×1, 1 s réelle = 1 pas (1 jour simulé = 24 min réelles) ; ×10 = 10 pas/s (≈ 2,4 min par jour) ; ×100 = 100 pas/s (≈ 14 s par jour, 1 an ≈ 1 h 26).
- La vitesse ne change que le nombre de pas par seconde réelle (D-02). Au-delà de ×100, hors jeu (essais sans affichage), le moteur tourne aussi vite que possible, sans changer le pas.
- Le rendu n'est interpolé qu'à ×1 ; aux vitesses supérieures il affiche le dernier pas calculé.

### Unités et conventions de bilan

| Grandeur | Unité | Nature |
| --- | --- | --- |
| Eau (brute, traitée) | litre (L) | Stock |
| Nourriture | kilocalorie (kcal) ; repas = 700 kcal | Stock |
| Puissance électrique | kilowatt (kW) | Flux instantané (production, demande, capacité) |
| Énergie stockée | kilowattheure (kWh) | Stock |
| Pièces détachées | unités entières par famille | Stock |

- Les stocks sont des **entiers dans la plus petite sous-unité** (mL, Wh, kcal) pour éviter toute dérive de flottants et garder la reproductibilité (D-02) ; l'affichage convertit en L et kWh.
- **Bilan par pas** : `stock(t+1) = stock(t) + production − consommation − pertes`, calculé sur l'état au début du pas. Une puissance en kW devient une énergie sur un pas par `kW × (1/60) h` = `kW / 60` kWh.
- Un stock ne descend jamais sous 0 : un prélèvement est limité à la quantité disponible, le manque est consigné (pénurie), pas reporté en dette.
- Les stocks sont **locaux** (par réservoir, entrepôt, réfectoire) ; le bilan global n'est qu'une somme d'affichage (concept §7.1).
- Ordres de grandeur de départ, à calibrer au prototype : eau ≈ 3 L/habitant/jour potable et cuisine (≈ 150 L/habitant/jour avec les autres usages), nourriture ≈ 2 000 kcal/habitant/jour.

### Démographie initiale (étape 1)

- **Population fixe : 2 000 habitants** au départ, sans naissances ni décès naturels à l'étape 1 (le renouvellement générationnel, §4.3, vient ensuite).
- **Âges en années entières**, tirés par le PRNG selon une distribution simple à 4 classes : 0-14 ans 20 %, 15-39 ans 40 %, 40-64 ans 30 %, 65 ans et plus 10 % ; uniforme au sein d'une classe (plafond 90 ans).
- Les habitants **vieillissent** d'un an tous les 360 jours (anniversaire dérivé de l'identifiant), sans effet de mortalité à l'étape 1.
- Main-d'œuvre : 15-64 ans (≈ 70 %) ; les enfants et 65+ ne comptent pas comme force de travail (§5.2.2).
- La distribution est un **paramètre de scénario** consigné dans la fiche d'expérience.

### Limite

Valeurs de départ, pas des vérités : calibrées par mesure au prototype, avec mise à jour de ce document.
