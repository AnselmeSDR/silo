# Décisions

## D-SIL-05 — Géométrie du silo (§18.1)

Point de départ : `maquettes/silo-escalier-central.html` (illustrative). Les cotes ci-dessous sont
reprises de la maquette, arrondies, et deviennent les valeurs de référence du modèle spatial.
Repère : axe du puits = origine ; rayons en mètres depuis l'axe.

### Cotes

| Élément | Valeur | Note |
|---|---|---|
| Hauteur d'un niveau (plancher à plancher) | 4,2 m | dalle 0,3 m |
| Noyau central porteur | rayon 2,65 m (Ø 5,3 m) | béton plein |
| Escalier | rayons 2,8 à 6,7 m, largeur 3,9 m | largeur utile ≈ 3,7 m (parapets) |
| Marches | 30 par niveau, demi-tour par niveau | contremarche 0,14 m ; giron 0,29 m (int.) / 0,50 m (ligne de marche r = 4,75) / 0,70 m (ext.) ; pente ≈ 26° (int.) / ≈ 16° (ligne de marche) / ≈ 11° (ext.) |
| Dégagement vertical d'un tour complet | 8,4 m | 2 niveaux |
| Passerelle palier → coursive | longueur 6,5 m (r 6,3 à 12,8), largeur 3,6 m | une par niveau, alternant 0° / 180° (demi-tour) |
| Puits (vide libre) | rayon 12 m (Ø 24 m) | garde-corps 0,95 m |
| Coursive annulaire | rayons 12 à 18,5 m (6,5 m), ≈ 620 m² par niveau | portes d'accès aux locaux côté paroi |
| Paroi extérieure | rayon 18,5 m | |
| Artère | longueur 30 m depuis la paroi, couloir 7,4 m, hauteur libre 3,2 m | fond à r = 48,5 m ; 30 m = limite d'excavation (règle de scénario, §18.1 dernier point) |
| Local d'artère | module 6 m de façade, ≈ 5,6 × 5,1 m (≈ 29 m²), hauteur 3 m | 5 par côté, 10 par artère |

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

| Segment | Distance | Temps |
|---|---|---|
| Un niveau d'escalier (ligne de marche r = 4,75) | 15,5 m | 22 s montée, 17 s descente |
| Passerelle | 6,5 m | 5 s |
| Coursive, palier → artère à 90° | ≈ 24 m (r = 15,25) | ≈ 18 s (0 s si l'artère est alignée) |
| Artère, entrée → fond | 30 m | 23 s (≈ 12 s en moyenne vers un local) |

Local à local, k niveaux d'écart, cible à 4 artères (coursive ≈ 9 s en moyenne) :
**montée ≈ 52 s + 22 s × k ; descente ≈ 52 s + 17 s × k**. Prototype à 2 artères : + ≈ 18 s.

| k | Montée | Descente |
|---|---|---|
| 1 | 1 min 15 | 1 min 10 |
| 6 | 3 min | 2 min 35 |
| 12 | 5 min 15 | 4 min 15 |
| 23 | 9 min 20 | 7 min 25 |

Porteur chargé (23 niveaux, montée) : ≈ 13 min. Conséquence de conception : au-delà de ≈ 6 niveaux, un trajet quotidien
coûte plusieurs minutes dans chaque sens ; le placement des logements par rapport aux ateliers et aux services
contraint donc réellement la vie du silo.
