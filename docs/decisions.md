# Décisions

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
