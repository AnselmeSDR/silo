# Décisions

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
