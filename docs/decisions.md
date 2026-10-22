# Décisions techniques

## D-01 — Stack du moteur et plateforme cible (SIL-01)

- **Langage et runtime** : TypeScript partout (moteur, rendu, outils). Un seul langage, typage strict pour les 2 000 entités persistantes, et Three.js (§15) est déjà en TypeScript/JavaScript.
- **Plateforme cible** : application web (navigateur) d'abord ; empaquetage bureau (Tauri ou Electron) envisagé ensuite, sans changer le code.
- **Séparation moteur/rendu** : le moteur est un paquet séparé, sans dépendance au DOM ni à Three.js. Il s'exécute dans Node pour les essais sans affichage (tests, mesures de performance, simulations longues) et dans un Web Worker pour le jeu, afin de ne pas bloquer le rendu. Le rendu ne lit que l'état exposé par le moteur.
- **À mesurer** : le budget de performance à 2 000 individus (§15.3) reste à valider par des mesures ; si TypeScript s'avère insuffisant sur un point chaud, il sera isolé (WebAssembly) sans remettre en cause la décision.

## D-02 — Pas de simulation, ordre de résolution, déterminisme

Réf. concept §15.4, §16.2 · ticket SIL-02.

> **Note** : les vitesses de jeu et l'interpolation du rendu ci-dessous sont remplacées par D-06 (vitesses pause/×1/×10/×100 ; rendu interpolé seulement à ×1). Le reste de D-02 reste en vigueur.

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

Statut : provisoire ; première mesure par le prototype SIL-12 (voir D-07), à refaire avec le vrai moteur. Source : concept §15.4.

### Matériel de référence

MacBook Pro Apple M2 Pro (CPU 10 cœurs), 16 Go de RAM, macOS, navigateur à jour, sur secteur, sans autre charge. Toute mesure indique la machine utilisée ; un autre matériel ne remplace pas la référence.

### Budget

| Mesure                               | Cible (p95)             | Plafond (p99) |
| ------------------------------------ | ----------------------- | ------------- |
| Pas moteur, 2 000 entités            | ≤ 10 ms                 | ≤ 14 ms       |
| Image de rendu, habitants instanciés | ≤ 16,6 ms (60 images/s) | ≤ 20 ms       |

Les 2 000 entités sont un objectif fonctionnel, pas une preuve : seule la mesure sur le matériel de référence fait foi.

### Méthode de mesure

- Script reproductible versionné (livré avec SIL-12), une commande, sortie JSON.
- Graine fixe du générateur aléatoire, scénario identique à chaque exécution.
- 5 s d'échauffement écartées, puis 60 s mesurées ; 3 exécutions, on retient la médiane.
- Moteur mesuré seul (sans rendu), puis rendu seul, puis les deux ensemble.
- Relevé : p50, p95, p99 et maximum par pas et par image ; échec si le p95 dépasse la cible.

### Si le budget n'est pas tenu

Réduire d'abord le coût par entité (fréquence de mise à jour par priorité) ; l'objectif de 2 000 entités ne change que sur décision du PO.

## D-SIL-04 — Format de sauvegarde et de journal (§15.5)

**Statut :** proposée, ticket SIL-04.

### Format et stockage

- Sauvegarde = un fichier JSON UTF-8 (`*.silo.json`), optionnellement compressé en gzip (`*.silo.json.gz`) ; pas de binaire tant qu'une mesure ne l'impose pas (budget 2 000 entités à mesurer, cf. §15.4).
- Écriture atomique : fichier temporaire puis renommage ; l'ancienne sauvegarde est conservée jusqu'au succès.
- Nombres : entiers ou décimaux sérialisés de façon déterministe (pas de `NaN`/`Infinity`), clés triées pour des diffs et des empreintes stables.
- Les identifiants d'entités sont des entiers stables, jamais des références d'objets ; les relations pointent par identifiant.

### Versionnage et migration

- Champ racine `formatVersion` (entier croissant, un par changement de schéma).
- Migration par fonctions explicites et pures `migrateVnToVn+1(data)`, chaînées jusqu'à la version courante ; aucune migration implicite ni tolérance silencieuse.
- Une sauvegarde plus récente que le moteur est refusée avec une erreur claire.
- Chaque migration a un test (fixture de l'ancienne version → état attendu).

### Contenu minimal

| Clé                              | Contenu                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `formatVersion`, `engineVersion` | versions du schéma et du moteur                                                      |
| `scenario`                       | identifiant et paramètres du scénario, graine initiale                               |
| `clock`                          | numéro de pas, temps simulé                                                          |
| `prng`                           | état complet du générateur (par flux nommé si plusieurs)                             |
| `world`                          | lieux, réseaux, installations, topologie du silo                                     |
| `entities`                       | habitants : identités, personnalités, états, mémoires utiles                         |
| `relations`                      | graphe social des liens significatifs                                                |
| `stocks`                         | ressources et stocks                                                                 |
| `authorities`                    | autorités, politiques, lois en vigueur                                               |
| `deferredCommands`               | file des commandes différées (échéance, émetteur, charge) dans l'ordre de résolution |
| `voice`                          | état de la Voix et décisions déjà enregistrées                                       |

Hors sauvegarde : état de présentation (caméra, panneaux), recalculable.

### Journal

- Journal d'événements en JSON Lines (`*.silo.log.jsonl`), ajout seul, une ligne par entrée : `{step, seq, type, ...}`.
- Deux familles d'entrées : commandes d'entrée (joueur, Voix, y compris sorties d'IA à réinjecter, cf. §16) et événements causaux (cause → effet, pour le mode d'analyse, §13.4).
- Rejeu exact = sauvegarde initiale + journal des commandes d'entrée ; reprise rapide = sauvegarde périodique (snapshot) + journal depuis ce pas.
- Le journal référence la sauvegarde par `scenario.seed` et une empreinte (hash) pour détecter une divergence.

### Compromis

JSON : lisible, diffable, migrations simples, plus lourd et plus lent qu'un binaire. À rouvrir seulement si une mesure dépasse le budget.

## D-05 — Direction visuelle, caméra, coupe et masquage (SIL-06)

Statut : retenue pour l'étape 1, à confirmer par un test de rendu instancié (voir « Réserve »).

### Style retenu

**Industriel sobre à géométrie simplifiée** : fusion des maquettes B (industriel habité) et D (puits et
artères), avec la lisibilité de C (volumes simples, matières mates).

| Maquette                | Verdict                               | Raison                                                                                                      |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A, coupe architecturale | Écartée comme style, gardée comme vue | Façade plate qui contredit le puits cylindrique ; sa logique de coupe devient le mode « coupe par niveau ». |
| B, industriel habité    | Retenue (matières, ambiance)          | Béton, acier, lumière chaude des lieux habités contre lumière froide des locaux techniques.                 |
| C, low-poly stylisé     | Retenue (géométrie)                   | Formes simples et ombres de contact : réaliste à instancier pour 2 000 habitants. Sans l'aspect jouet.      |
| D, puits et artères     | Retenue (structure)                   | Puits, escalier hélicoïdal et artères radiales : c'est la forme du monde (concept §3.1).                    |

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
   - _Silo_ : tendances et incidents, habitants en points agrégés ;
   - _Niveau_ : habitants individuels, équipements, réseaux du niveau ;
   - _Artère_ : caméra radiale au niveau du sol, jusqu'au fond de l'artère.
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

| Famille               | Repère                        | Couleur                     | Symbole / motif                                                     |
| --------------------- | ----------------------------- | --------------------------- | ------------------------------------------------------------------- |
| Réseau eau            | flux, conduites               | Bleu `#2E86DE`              | Goutte ; flux en pointillés longs                                   |
| Réseau électricité    | câbles, flux                  | Ambre `#F5A623`             | Éclair ; flux en tirets courts                                      |
| Réseau air            | conduits                      | Cyan clair `#7FD6E8`        | Trois traits ondulés ; flux en ondes                                |
| Réseau communications | liaisons                      | Violet `#9B6BD6`            | Antenne ; flux en points                                            |
| Besoins (alerte)      | icône au-dessus de l'habitant | Corail `#E8604C`            | Pictogramme propre à chaque besoin, contour renforcé quand critique |
| Métiers               | pastille ou vêtement          | Famille de teintes modérées | Initiale-glyphe du métier (texte au zoom _Niveau_)                  |
| Politique (aura)      | halo sur quelques habitants   | Teinte par camp             | Anneau plein / pointillé / double selon le camp                     |
| Sélection             | contour                       | Ambre clair `#FFD27A`       | Contour épais                                                       |
| Panne / coupure       | alerte locale                 | Rouge `#D64545`             | Triangle + barre ; flux interrompu et grisé                         |

Règles :

- Un flux **interrompu** n'est jamais animé (concept §14.2) ; il est grisé et barré.
- Contraste texte et symboles ≥ 4,5:1 sur le fond ; taille minimale d'un symbole 12 px à l'échelle _Niveau_.
- Les réseaux ont une couleur **et** un motif de flux **et** un pictogramme ; les calques peuvent
  s'activer indépendamment.
- Mode « contraste renforcé » prévu : couleurs remplacées par des motifs seuls.

### Réserve

La faisabilité en rendu instancié (2 000 habitants, géométrie des niveaux, ombres) n'est **pas mesurée**
dans ce ticket : le point de départ du ticket est confirmé sur la base des maquettes et du concept. Un
test de rendu Three.js (instances, coupe, brouillard) doit valider ou ajuster la géométrie simplifiée
avant la fin de l'étape 1.

## D-SIL-05 — Géométrie du silo (§18.1)

Point de départ : `maquettes/silo-escalier-central.html` (illustrative). Les cotes ci-dessous sont
reprises de la maquette, arrondies, et deviennent les valeurs de référence du modèle spatial.
Repère : axe du puits = origine ; rayons en mètres depuis l'axe.

### Cotes

| Élément                                   | Valeur                                                            | Note                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hauteur d'un niveau (plancher à plancher) | 4,2 m                                                             | dalle 0,3 m                                                                                                                                                 |
| Noyau central porteur                     | rayon 2,65 m (Ø 5,3 m)                                            | béton plein                                                                                                                                                 |
| Escalier                                  | rayons 2,8 à 6,7 m, largeur 3,9 m                                 | largeur utile ≈ 3,7 m (parapets)                                                                                                                            |
| Marches                                   | 30 par niveau, demi-tour par niveau                               | contremarche 0,14 m ; giron 0,29 m (int.) / 0,50 m (ligne de marche r = 4,75) / 0,70 m (ext.) ; pente ≈ 26° (int.) / ≈ 16° (ligne de marche) / ≈ 11° (ext.) |
| Dégagement vertical d'un tour complet     | 8,4 m                                                             | 2 niveaux                                                                                                                                                   |
| Passerelle palier → coursive              | longueur 6,5 m (r 6,3 à 12,8), largeur 3,6 m                      | une par niveau, alternant 0° / 180° (demi-tour)                                                                                                             |
| Puits (vide libre)                        | rayon 12 m (Ø 24 m)                                               | garde-corps 0,95 m                                                                                                                                          |
| Coursive annulaire                        | rayons 12 à 18,5 m (6,5 m), ≈ 620 m² par niveau                   | portes d'accès aux locaux côté paroi                                                                                                                        |
| Paroi extérieure                          | rayon 18,5 m                                                      |                                                                                                                                                             |
| Artère                                    | longueur 30 m depuis la paroi, couloir 7,4 m, hauteur libre 3,2 m | fond à r = 48,5 m ; 30 m = limite d'excavation (règle de scénario, §18.1 dernier point)                                                                     |
| Local d'artère                            | module 6 m de façade, ≈ 5,6 × 5,1 m (≈ 29 m²), hauteur 3 m        | 5 par côté, 10 par artère                                                                                                                                   |

### Niveaux et embranchements

- **Niveaux** : prototype **12** (≈ 50 m de profondeur), cible **24** (≈ 100 m, comme la maquette). L'escalier est
  paramétré par le nombre de niveaux.
- **Artères** : prototype **2 par niveau** (0° et 180°), cible **4** (0°, 90°, 180°, 270°). Cible : 4 × 10 = 40 locaux
  par niveau, 960 locaux pour 24 niveaux (≈ 2 habitants par local pour 2 000 habitants).
- **Embranchements** : topologie en arbre : palier → passerelle → coursive → artère → local. Pas de liaison
  transversale entre artères : tout déplacement entre deux artères passe par la coursive, ce qui rend les
  distances et les points de contrôle significatifs. Le nombre d'artères par niveau et leur angle restent des
  paramètres de scénario (le concept ne fige pas la topologie).

### Temps de trajet (à pied, sans encombrement)

Vitesses : plat 1,3 m/s ; escalier montée 0,7 m/s, descente 0,9 m/s (le long de la ligne de marche) ; porteur chargé × 0,7.

| Segment                                         | Distance           | Temps                                  |
| ----------------------------------------------- | ------------------ | -------------------------------------- |
| Un niveau d'escalier (ligne de marche r = 4,75) | 15,5 m             | 22 s montée, 17 s descente             |
| Passerelle                                      | 6,5 m              | 5 s                                    |
| Coursive, palier → artère à 90°                 | ≈ 24 m (r = 15,25) | ≈ 18 s (0 s si l'artère est alignée)   |
| Artère, entrée → fond                           | 30 m               | 23 s (≈ 12 s en moyenne vers un local) |

Local à local, k niveaux d'écart, cible à 4 artères (coursive ≈ 9 s en moyenne) :
**montée ≈ 52 s + 22 s × k ; descente ≈ 52 s + 17 s × k**. Prototype à 2 artères : + ≈ 18 s.

| k   | Montée   | Descente |
| --- | -------- | -------- |
| 1   | 1 min 15 | 1 min 10 |
| 6   | 3 min    | 2 min 35 |
| 12  | 5 min 15 | 4 min 15 |
| 23  | 9 min 20 | 7 min 25 |

Porteur chargé (23 niveaux, montée) : ≈ 13 min. Conséquence de conception : au-delà de ≈ 6 niveaux, un trajet quotidien
coûte plusieurs minutes dans chaque sens ; le placement des logements par rapport aux ateliers et aux services
contraint donc réellement la vie du silo.

## D-06 — Échelle du temps, unités de ressources et démographie initiale

Réf. concept §4.3, §7.1 · ticket SIL-07. Complète D-02 (pas fixe d'1 minute simulée).

### Échelle du temps

- **1 jour simulé = 1 440 pas** (24 h × 60 min), 1 pas = 1 min simulée.
- Calendrier simplifié : **1 an = 360 jours** (12 mois de 30 jours), sans bissextile ni saisons au départ. Un pas de simulation est un entier, le temps simulé en est dérivé (`jour = pas / 1440`).
- **Vitesses de lecture** : pause, ×1, ×10, ×100. À ×1, 1 s réelle = 1 pas (1 jour simulé = 24 min réelles) ; ×10 = 10 pas/s (≈ 2,4 min par jour) ; ×100 = 100 pas/s (≈ 14 s par jour, 1 an ≈ 1 h 26).
- La vitesse ne change que le nombre de pas par seconde réelle (D-02). Au-delà de ×100, hors jeu (essais sans affichage), le moteur tourne aussi vite que possible, sans changer le pas.
- Le rendu n'est interpolé qu'à ×1 ; aux vitesses supérieures il affiche le dernier pas calculé.

### Unités et conventions de bilan

| Grandeur             | Unité                                 | Nature                                          |
| -------------------- | ------------------------------------- | ----------------------------------------------- |
| Eau (brute, traitée) | litre (L)                             | Stock                                           |
| Nourriture           | kilocalorie (kcal) ; repas = 700 kcal | Stock                                           |
| Puissance électrique | kilowatt (kW)                         | Flux instantané (production, demande, capacité) |
| Énergie stockée      | kilowattheure (kWh)                   | Stock                                           |
| Pièces détachées     | unités entières par famille           | Stock                                           |

- Les stocks sont des **entiers dans la plus petite sous-unité** (mL, Ws, kcal) pour éviter toute dérive de flottants et garder la reproductibilité (D-02) ; l'affichage convertit en L, kW et kWh.
- **Bilan par pas** : `stock(t+1) = stock(t) + production − consommation − pertes`, calculé sur l'état au début du pas. Les puissances sont des **entiers en W** et l'énergie stockée est comptée en **wattsecondes (Ws)** : sur un pas de 60 s, `P W × 60 s = 60 × P Ws`, exact sans arrondi (1 kW = 60 000 Ws par pas ; 1 kWh = 3 600 000 Ws). L'affichage convertit en kW et kWh.
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

## D-07 — Mesures du prototype jetable (SIL-12)

Statut : le budget D-03 est tenu avec une grande marge sur le prototype ; ce n'est **pas** une validation du moteur réel.

### Ce qui a été mesuré

Code jetable (`packages/engine/src/proto`, `packages/render/src/proto.ts`, `packages/tools/proto`), à ne pas réutiliser tel quel.

- **Moteur** : 2 000 entités en tableaux typés, 3 systèmes (besoins, social, déplacement), ordre mélangé par PRNG par système (D-02), 12 niveaux.
- **Rendu** : 2 000 silhouettes = 3 `InstancedMesh` (corps, tête, jambes), soit 6 000 instances, 16 appels de dessin, ≈ 594 000 triangles, 12 dalles, une lumière hémisphérique + une directionnelle (avec ou sans ombres 2048²), Three.js 0.160.0.
- **Matériel** : MacBook Pro M2 Pro (matériel de référence D-03), Chrome 155 headless (GPU Metal), fenêtre 1280×800 à ×2, Node 22.14.
- **Méthode** : D-03 (graine 42, 5 s d'échauffement, 60 s mesurées, 3 exécutions, médiane). Une exécution « rendu seul sans ombres » sur 3 a expiré : médiane sur 2.
- **Commandes** : `pnpm --filter @silo/engine bench` et `node packages/tools/proto/renderBenchAll.mjs`.

### Résultats (médiane des exécutions, p95 / p99 en ms)

| Mesure                                                 | p95 | p99 | Cible p95 | Plafond p99 |
| ------------------------------------------------------ | --- | --- | --------- | ----------- |
| Pas moteur seul (Node)                                 | 0,5 | 0,8 | 10        | 14          |
| Rendu seul, sans ombres (travail)                      | 1,4 | 1,6 | 16,6      | 20          |
| Rendu seul, avec ombres (travail)                      | 1,9 | 2,1 | 16,6      | 20          |
| Moteur + rendu, ombres (image)                         | 3,1 | 3,8 | 16,6      | 20          |
| Moteur + rendu, ombres (pas moteur dans le navigateur) | 2,1 | 2,8 | 10        | 14          |

« Travail » = mise à jour des instances + soumission + `gl.finish()` ; l'intervalle entre images reste à 16,7 ms (60 images/s) sur toutes les séries, avec un pic isolé de 33 ms en moteur + rendu.

### Conclusion

1. **Le rendu instancié de 2 000 habitants tient très largement dans le budget** (≈ 3 ms sur 16,6 ms moteur compris, ombres comprises) : la géométrie simplifiée de D-05 est faisable. La réserve de D-05 sur le rendu instancié est levée pour les habitants.
2. **Le budget moteur à 2 000 entités tient pour une simulation simple** (0,5 ms), mais ce prototype n'a ni pathfinding, ni réseaux, ni mémoires, ni journal. Les 10 ms ne sont donc pas démontrés pour le moteur réel : le coût réel sera à mesurer par système au fil des tickets, avec le même script.
3. Non mesuré ici : décor réel (niveaux, artères), coupe, brouillard, interpolation à ×1 (D-06), Web Worker (D-01), autres machines. À refaire dans l'étape 1 avec la vraie scène.
4. **D-03 reste en vigueur sans changement** (aucune cible ajustée). Pas de WebAssembly à prévoir à ce stade (D-01).
5. Mesure fragile : en fenêtre visible, `requestAnimationFrame` s'arrête si l'écran se met en veille ; le script utilise Chrome headless. Sur écran 120 Hz les intervalles sont de 8,3 ms.
