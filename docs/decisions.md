# Décisions

## D-01 — Direction visuelle, caméra, coupe et masquage (SIL-06)

Statut : retenue pour l'étape 1, à confirmer par un test de rendu instancié (voir « Réserve »).

### Style retenu

**Industriel sobre à géométrie simplifiée** : fusion des maquettes B (industriel habité) et D (puits et
artères), avec la lisibilité de C (volumes simples, matières mates).

| Maquette | Verdict | Raison |
|---|---|---|
| A, coupe architecturale | Écartée comme style, gardée comme vue | Façade plate qui contredit le puits cylindrique ; sa logique de coupe devient le mode « coupe par niveau ». |
| B, industriel habité | Retenue (matières, ambiance) | Béton, acier, lumière chaude des lieux habités contre lumière froide des locaux techniques. |
| C, low-poly stylisé | Retenue (géométrie) | Formes simples et ombres de contact : réaliste à instancier pour 2 000 habitants. Sans l'aspect jouet. |
| D, puits et artères | Retenue (structure) | Puits, escalier hélicoïdal et artères radiales : c'est la forme du monde (concept §3.1). |

Règles de style :

- Géométrie simplifiée : bords légèrement biseautés, pas de détail sous l'échelle d'un habitant, peu de
  matériaux distincts (béton, acier, roche).
- Matières mates, couleurs de décor désaturées (gris chaud, roche sombre). **Aucune couleur vive sur le
  décor** : la couleur est réservée aux repères (palette fonctionnelle).
- Habitants : silhouettes simplifiées tête/corps/membres, instanciées, avec un repère de métier lisible.
- Éclairage : une lumière globale douce, lampes locales chaudes, ombres de contact ; pas de flou ni
  d'effet cinématographique.
- Interface minimale (concept §14) : monde ≥ 85 % de l'écran.

### Règles de caméra

1. **Orbitale autour de l'axe du puits** : rotation libre, zoom continu, montée et descente le long du
   puits. Valeur par défaut : plongée oblique d'environ 35°.
2. **Trois niveaux d'échelle**, qui sélectionnent le niveau de détail :
   - *Silo* : tendances et incidents, habitants en points agrégés ;
   - *Niveau* : habitants individuels, équipements, réseaux du niveau ;
   - *Artère* : caméra radiale au niveau du sol, jusqu'au fond de l'artère.
3. **Suivi** d'un habitant : la caméra suit sans changer l'état de la simulation.
4. **Invariant** : déplacer la caméra ne change jamais un résultat de simulation (concept §15.3). La
   caméra ne pilote que le rendu et le niveau de détail d'affichage.
5. Limites : pas de passage à travers la roche ; la caméra reste dans le volume du silo ou d'une artère.

### Coupe par niveau

- La **coupe** est une vue, pas une opération sur le monde. Un niveau est « isolé » en masquant ceux qui
  le cachent.
- Trois états par niveau : **visible**, **estompé** (silhouette à 25 % d'opacité, sans habitants),
  **masqué**.
- Par défaut : niveau sélectionné visible, niveaux au-dessus masqués, niveaux en dessous estompés
  sur 3 niveaux puis masqués.
- Sélecteur vertical de niveau (« Niveau 42 »), molette + modificateur pour changer de niveau sans
  quitter la vue.
- Plan de coupe horizontal au plafond du niveau sélectionné ; plan vertical optionnel passant par l'axe
  du puits pour lire les artères en coupe.
- Ce qui reste toujours visible dans une coupe : l'escalier central et les alertes actives (marqueur
  seul, même sur un niveau masqué).

### Règles de masquage

Deux masquages distincts, à ne pas confondre :

1. **Masquage de vue** (coupe, voir ci-dessus) : purement visuel, réversible, sans effet sur la
   simulation.
2. **Masquage d'information** (brouillard, concept §12) : un lieu non observé par le rôle du joueur est
   rendu en **brouillard** (volume gris estompé, aucun habitant ni flux précis, dernier état connu daté).
   Le brouillard dépend du rôle, jamais de la caméra.

Un niveau peut être masqué en vue **et** en brouillard : le brouillard prime, la coupe ne le révèle pas.

### Palette fonctionnelle et symboles accessibles

Couleur toujours **doublée** d'une forme ou d'un motif : aucune information portée par la couleur seule.
Palette choisie pour rester distincte en daltonisme (deutéranopie, protanopie) ; à valider par simulation
avant l'intégration.

| Famille | Repère | Couleur | Symbole / motif |
|---|---|---|---|
| Réseau eau | flux, conduites | Bleu `#2E86DE` | Goutte ; flux en pointillés longs |
| Réseau électricité | câbles, flux | Ambre `#F5A623` | Éclair ; flux en tirets courts |
| Réseau air | conduits | Cyan clair `#7FD6E8` | Trois traits ondulés ; flux en ondes |
| Réseau communications | liaisons | Violet `#9B6BD6` | Antenne ; flux en points |
| Besoins (alerte) | icône au-dessus de l'habitant | Corail `#E8604C` | Pictogramme propre à chaque besoin, contour renforcé quand critique |
| Métiers | pastille ou vêtement | Famille de teintes modérées | Initiale-glyphe du métier (texte au zoom *Niveau*) |
| Politique (aura) | halo sur quelques habitants | Teinte par camp | Anneau plein / pointillé / double selon le camp |
| Sélection | contour | Ambre clair `#FFD27A` | Contour épais |
| Panne / coupure | alerte locale | Rouge `#D64545` | Triangle + barre ; flux interrompu et grisé |

Règles :

- Un flux **interrompu** n'est jamais animé (concept §14.2) ; il est grisé et barré.
- Contraste texte et symboles ≥ 4,5:1 sur le fond ; taille minimale d'un symbole 12 px à l'échelle *Niveau*.
- Les réseaux ont une couleur **et** un motif de flux **et** un pictogramme ; les calques peuvent
  s'activer indépendamment.
- Mode « contraste renforcé » prévu : couleurs remplacées par des motifs seuls.

### Réserve

La faisabilité en rendu instancié (2 000 habitants, géométrie des niveaux, ombres) n'est **pas mesurée**
dans ce ticket : le point de départ du ticket est confirmé sur la base des maquettes et du concept. Un
test de rendu Three.js (instances, coupe, brouillard) doit valider ou ajuster la géométrie simplifiée
avant la fin de l'étape 1.
