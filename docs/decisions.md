# Décisions

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

| Clé | Contenu |
|---|---|
| `formatVersion`, `engineVersion` | versions du schéma et du moteur |
| `scenario` | identifiant et paramètres du scénario, graine initiale |
| `clock` | numéro de pas, temps simulé |
| `prng` | état complet du générateur (par flux nommé si plusieurs) |
| `world` | lieux, réseaux, installations, topologie du silo |
| `entities` | habitants : identités, personnalités, états, mémoires utiles |
| `relations` | graphe social des liens significatifs |
| `stocks` | ressources et stocks |
| `authorities` | autorités, politiques, lois en vigueur |
| `deferredCommands` | file des commandes différées (échéance, émetteur, charge) dans l'ordre de résolution |
| `voice` | état de la Voix et décisions déjà enregistrées |

Hors sauvegarde : état de présentation (caméra, panneaux), recalculable.

### Journal

- Journal d'événements en JSON Lines (`*.silo.log.jsonl`), ajout seul, une ligne par entrée : `{step, seq, type, ...}`.
- Deux familles d'entrées : commandes d'entrée (joueur, Voix, y compris sorties d'IA à réinjecter, cf. §16) et événements causaux (cause → effet, pour le mode d'analyse, §13.4).
- Rejeu exact = sauvegarde initiale + journal des commandes d'entrée ; reprise rapide = sauvegarde périodique (snapshot) + journal depuis ce pas.
- Le journal référence la sauvegarde par `scenario.seed` et une empreinte (hash) pour détecter une divergence.

### Compromis

JSON : lisible, diffable, migrations simples, plus lourd et plus lent qu'un binaire. À rouvrir seulement si une mesure dépasse le budget.
