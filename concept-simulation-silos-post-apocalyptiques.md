# Simulation autonome de silos post-apocalyptiques

## Document de synthèse du concept

**Version :** 1.2
**Date :** 21 octobre 2026  
**Langue :** français  
**Nature :** document de conception de référence, préalable à un prototype.

> **Périmètre et fidélité de cette synthèse.** Ce document rassemble les principes explicitement présents dans les échanges accessibles de la conversation « Simulation gestion post-apocalyptique » et les thèmes demandés pour leur synthèse. Certaines anciennes réponses ne sont accessibles que sous forme de références sans contenu textuel. Les détails qui ne peuvent pas être vérifiés dans ces échanges sont présentés comme des propositions de conception, des exemples ou des décisions ouvertes. La feuille de route et l’architecture décrivent une manière de réaliser le concept ; elles ne constituent pas des choix techniques déjà arrêtés.

---

## Sommaire

1. [Vision générale](#1-vision-générale)
2. [Principes structurants](#2-principes-structurants)
3. [Monde et silos configurables](#3-monde-et-silos-configurables)
4. [Population persistante et générations](#4-population-persistante-et-générations)
5. [Besoins, métiers, personnalités et décisions](#5-besoins-métiers-personnalités-et-décisions)
6. [Relations et mémoire collective](#6-relations-et-mémoire-collective)
7. [Ressources et réseaux physiques](#7-ressources-et-réseaux-physiques)
8. [Politique émergente et auras](#8-politique-émergente-et-auras)
9. [La Voix : algorithme puis IA optionnelle](#9-la-voix--algorithme-puis-ia-optionnelle)
10. [Modes de joueur](#10-modes-de-joueur)
11. [Révolutions et contrôle territorial](#11-révolutions-et-contrôle-territorial)
12. [Brouillard d’information](#12-brouillard-dinformation)
13. [Événements causaux et histoires émergentes](#13-événements-causaux-et-histoires-émergentes)
14. [Interface minimaliste et flux lumineux](#14-interface-minimaliste-et-flux-lumineux)
15. [Architecture : simulation et rendu](#15-architecture--simulation-et-rendu)
16. [Expériences reproductibles](#16-expériences-reproductibles)
17. [Feuille de route](#17-feuille-de-route)
18. [Décisions ouvertes et critères de réussite](#18-décisions-ouvertes-et-critères-de-réussite)

---

## 1. Vision générale

Créer une simulation autonome de sociétés humaines confinées dans des silos souterrains après une catastrophe. L’imaginaire évoque **Silo** et **Fallout** : habitat fermé, dépendance à des infrastructures vitales, contrôle de l’information, hiérarchies sociales, survie et conflits politiques. Ces références donnent une direction d’ambiance ; elles ne fixent pas une reproduction de leur univers, de leurs personnages ou de leurs règles.

Chaque silo est simultanément :

- un espace physique constitué de lieux, de passages et de réseaux ;
- un système de production, de consommation, de stockage et de maintenance ;
- une société d’individus ayant leurs besoins, leurs métiers, leurs personnalités et leurs relations ;
- un territoire où plusieurs autorités peuvent coopérer ou s’affronter ;
- une histoire qui se construit et se transmet au fil des générations.

La simulation doit vivre sans interventions constantes du joueur. Les habitants travaillent, se déplacent, consomment, entretiennent les installations, nouent des liens, interprètent les événements et prennent position. Le joueur peut observer cette évolution ou intervenir depuis différents rôles.

Le cœur du projet est la rencontre entre **contraintes matérielles, comportements individuels, circulation de l’information et pouvoir politique**. Une histoire intéressante naît de leurs interactions : une panne modifie les conditions de vie, les conditions de vie modifient la confiance, la confiance transforme la coopération et cette coopération influence la réparation de la panne.

## 2. Principes structurants

### 2.1 Une simulation algorithmique dès le départ

La première version fonctionne entièrement avec des règles, des calculs de besoins, des priorités, des décisions et des événements. Aucun modèle génératif n’est nécessaire au fonctionnement des habitants ou du silo.

L’éventuel ajout d’une IA intervient plus tard, dans un rôle circonscrit : **incarner la Voix**. Les infrastructures, les ressources, les habitants et les conséquences des actions continuent d’être simulés par le moteur algorithmique.

### 2.2 Deux mille habitants signifient deux mille individus

Pour un silo de 2 000 habitants, il existe **2 000 entités persistantes**. Un habitant conserve son identité, son état, ses relations et son histoire lorsqu’il quitte l’écran. La population n’est pas remplacée par un simple compteur lorsque la caméra s’éloigne.

Cela ne signifie pas que chaque individu doit être dessiné ou recalculé avec la même fréquence à tout instant. L’optimisation peut porter sur le rendu et l’ordonnancement des calculs, à condition de préserver l’existence et la continuité des individus.

### 2.3 Le pouvoir dépend du monde matériel

Les ordres ont besoin de moyens pour être transmis et exécutés. Une autorité ne contrôle pas automatiquement tout le silo. Ses capacités dépendent des personnes qui lui obéissent, des zones qu’elle maîtrise, des équipements disponibles et des réseaux encore opérationnels.

### 2.4 La connaissance dépend du rôle

L’état réel du monde et ce que le joueur en sait sont deux choses distinctes. Caméras, présence physique, rapports, accès professionnels et communications déterminent les informations disponibles.

### 2.5 Les événements doivent avoir des conséquences compréhensibles

Les crises et les trajectoires sociales doivent être reliées à des causes. La simulation peut inclure du hasard, mais celui-ci doit s’inscrire dans des conditions identifiables et permettre des expériences reproductibles.

## 3. Monde et silos configurables

### 3.1 Le silo comme environnement physique

Un silo est composé de niveaux ou de secteurs reliés par des chemins. Il peut contenir des logements, des ateliers, des espaces agricoles, des réserves, des installations de traitement, des lieux de soin, des bureaux administratifs et des postes de sécurité.

**Organisation spatiale retenue :** un silo cylindrique en 3D, doté d’un grand puits vertical et d’un escalier central continu inspiré de celui de la série *Silo*. La profondeur est une dimension réelle de l’espace et des déplacements.

L’architecture s’organise autour de quatre éléments :

- **Un noyau central porteur**, autour duquel s’enroule l’escalier.
- **Un large escalier hélicoïdal en béton**, composé de marches en éventail, avec des parapets pleins et des mains courantes métalliques. Il relie les niveaux du haut jusqu’en bas.
- **Des passerelles et des paliers**, qui relient l’escalier aux coursives périphériques. Un espace vide sépare la structure centrale des étages situés contre la paroi du silo.
- **Des artères qui s’enfoncent dans les étages**, accessibles depuis les coursives, avec des embranchements, des logements et des locaux techniques répartis en profondeur.

Cette disposition donne une fonction aux distances et aux passages obligés. Le trajet d’un habitant entre deux étages doit emprunter les marches, les paliers et les passerelles existants. Ces accès peuvent devenir des lieux de rencontre, des points de contrôle ou des zones de blocage.

Le joueur peut tourner autour du puits, monter ou descendre entre les niveaux, zoomer, dézoomer et avancer dans une artère jusqu’au fond d’un étage. Une vue en coupe et des calques de réseaux complètent cette navigation sans remplacer le volume 3D.

**Référence architecturale :** les images du décor et de sa prévisualisation publiées par [VFX Voice dans « Unraveling the Mysteries of Silo »](https://vfxvoice.com/unraveling-the-mysteries-of-silo/). Les dimensions et le nombre de tours entre deux étages de la maquette restent des choix de prototype, pas des mesures reproduites à l’identique depuis la série.

Une salle n’est pas seulement un décor : elle accueille des activités, dépend de ressources, dispose d’une capacité et peut devenir inaccessible, occupée ou dégradée.

### 3.2 Plusieurs silos, plusieurs conditions initiales

Les silos sont configurables selon plusieurs dimensions :

| Dimension | Exemples de paramètres |
|---|---|
| Population | Effectif, distribution des âges, compétences disponibles |
| Capacités | Production, stockage, logements, soins, maintenance |
| Infrastructures | Topologie, état, redondance et vulnérabilité des réseaux |
| Ressources | Stocks initiaux et accès aux matières nécessaires |
| Culture | Habitudes, croyances, rapport à l’autorité et mémoire collective |
| Politique | Règles, droits, contrôle, répartition des ressources |
| Information | Accès aux données, caméras et moyens de communication |

Trois grandes familles d’expériences sont prévues dans le concept :

1. **Silos égaux au départ** : mêmes capacités, cultures et populations initiales, puis observation des divergences.
2. **Silos inégaux au départ** : différences de ressources, d’effectifs, de compétences, de culture ou d’infrastructures.
3. **Silos matériellement égaux avec des politiques différentes** : comparaison de leurs évolutions sous des règles de gouvernance distinctes.

Pour isoler l’effet d’une politique, une expérience doit conserver aussi les caractéristiques individuelles, la topologie et les conditions aléatoires pertinentes. Deux silos ayant seulement le même nombre d’habitants ne sont pas nécessairement comparables.

### 3.3 Relations entre silos

Le contrôle de plusieurs silos fait partie des modes envisagés. Les modalités de leurs interactions restent ouvertes.

**Extensions possibles :** communications, échanges de ressources, transferts de population, alliances ou conflits. Elles supposent de préciser les moyens physiques de liaison et les connaissances que chaque silo possède des autres.

### 3.4 Catalogue des étages et secteurs

**Proposition de conception détaillée :** les fonctions suivantes composent un catalogue configurable. Un niveau peut accueillir plusieurs secteurs ; une grande fonction peut occuper plusieurs niveaux. Les équipements, les recettes et les capacités seront équilibrés au prototype.

| Type de secteur | Locaux et équipements | Activités et dépendances principales |
|---|---|---|
| Habitat | Logements, dortoirs, sanitaires, espaces communs | Repos, vie familiale, hygiène ; eau, air, éclairage, entretien |
| Restauration | Cuisines, préparation, réfectoires, réserves de proximité | Transformation et distribution des aliments ; eau, énergie, livraisons et gestion des déchets |
| Agriculture | Cultures, pépinières, irrigation, zones de préparation des récoltes | Production végétale ; eau, semences, nutriments, air et éclairage selon le système choisi |
| Production alimentaire complémentaire | Installations spécialisées selon le scénario | Diversification alimentaire ; filières à choisir, avec intrants et déchets propres plutôt qu’une production gratuite |
| Eau et assainissement | Réservoirs, pompes, filtration, traitement des eaux usées | Stockage, mise en circulation, traitement et contrôles ; énergie, filtres, réactifs éventuels et personnel |
| Énergie | Génération, distribution, tableaux de commande, stockage éventuel | Production et acheminement électriques ; source primaire, refroidissement et pièces selon l’équipement |
| Air et ventilation | Ventilateurs, conduits, filtres, capteurs, dispositifs de régénération éventuels | Renouvellement et traitement de l’air ; électricité, maintenance et consommables adaptés |
| Maintenance et industrie | Atelier mécanique, outillage, fabrication de pièces, magasin technique | Diagnostic, réparation et fabrication ; plans, compétences, matériaux et énergie |
| Santé | Consultation, infirmerie, pharmacie, salles de soins | Soins, repos médical et suivi ; personnel, eau, énergie et fournitures médicales |
| Logistique | Dépôts, réception, tri, préparation des commandes, relais de portage | Répartition des stocks et livraisons ; contenants, personnel et itinéraires accessibles |
| Recyclage et déchets | Collecte, tri, démontage, traitement, stockage des résidus | Récupération de matières et élimination des déchets ; énergie, eau, protection et débouchés de stockage |
| Éducation et archives | Classes, espaces d’apprentissage, bibliothèque, archives techniques | Formation, transmission des compétences et conservation des récits ; enseignants, documents et disponibilité des apprenants |
| Administration et vie collective | Bureaux, conseil, accueil, salles de réunion | Affectations, arbitrages, registres et décisions ; communications, accès à l’information et coopération |
| Sécurité | Postes, contrôle d’accès, locaux d’intervention, retenue éventuelle | Patrouilles et application des règles ; personnel, moyens matériels, ordres reçus et légitimité |
| Communications et surveillance | Relais, interphones, terminaux, supervision des caméras | Transmission des messages et observation ; alimentation, liaisons, équipements et autorisations |
| Culture et sociabilité | Espaces de rencontre, loisirs, rassemblements et lieux de mémoire | Relations, détente, organisation collective et transmission culturelle ; disponibilité, accès et règles locales |
| Accès extérieur | Sas, inspection, préparation et décontamination si le scénario le prévoit | Interface avec la surface ; protocole, équipements et environnement extérieur définis par le scénario |

### 3.5 Organisation verticale et fonctionnement des locaux

Une disposition possible place l’accès extérieur et certains services collectifs en haut, des quartiers d’habitat et de services à plusieurs hauteurs, et certaines installations lourdes dans les niveaux techniques. **Cet agencement n’est pas imposé** : le scénario doit pouvoir varier la topologie pour produire des distances, des dépendances et des inégalités différentes.

Des services de proximité évitent que tous les habitants traversent le silo pour chaque besoin. À l’inverse, concentrer une ressource critique dans un seul secteur crée une dépendance et un lieu stratégique. Les temps de marche, les changements d’étage, l’attente et la congestion influencent le quotidien.

Chaque local doit au minimum posséder :

- une fonction, une surface ou un volume utile et une capacité d’accueil ;
- des entrées, des passages et des droits d’accès ;
- des équipements, leur état et leurs raccordements aux réseaux ;
- des postes de travail et des compétences nécessaires ;
- des stocks locaux et des besoins d’approvisionnement ;
- un état de service : disponible, dégradé, arrêté, inaccessible ou occupé ;
- des dépendances de sécurité et d’habitabilité, notamment liées à l’air et à l’eau.

Les dimensions et les capacités limitent l’activité : un atelier trop petit, un réfectoire saturé ou un logement surpeuplé doivent avoir des effets. Le nombre d’occupants, le débit d’une machine et le volume d’un entrepôt restent des grandeurs distinctes.

La limite d’excavation de 30 mètres est une règle de scénario encore à préciser. La proximité d’autres silos peut devenir un enjeu de découverte, de secret ou de politique, sans donner d’emblée à chaque habitant la connaissance de leur emplacement.

## 4. Population persistante et générations

### 4.1 Identité individuelle

Chaque habitant doit être identifiable dans la durée. Un modèle de données possible comprend :

- une identité stable, un âge et un état de santé ;
- un lieu de résidence et une position actuelle ;
- des besoins et des réserves personnelles éventuelles ;
- un métier, des compétences et une affectation ;
- des traits de personnalité ;
- des opinions, des loyautés et des engagements politiques ;
- des relations avec d’autres habitants ;
- des souvenirs et des connaissances ;
- une activité en cours, des intentions et des contraintes d’action.

Cette liste est une proposition de structuration. Les variables précises et leur niveau de détail seront ajustés au prototype.

### 4.2 Continuité hors écran

Un technicien continue de travailler dans un secteur invisible. Un conflit de voisinage peut évoluer sans présence du joueur. Une personne conserve ses liens après un changement d’affectation. Revenir sur un habitant doit permettre de retrouver la continuité de son parcours.

Un décès termine l’activité d’un individu, sans effacer les traces pertinentes de son existence : parenté, souvenirs des proches, responsabilités passées ou participation à une crise.

### 4.3 Renouvellement de la population

La mémoire intergénérationnelle implique une temporalité assez longue pour voir le vieillissement, les naissances, les décès et la transmission des savoirs.

**Mécanismes proposés :** formation, apprentissage auprès de professionnels, transmission familiale et archives collectives. La disparition de personnes expérimentées peut réduire une capacité réelle si leurs compétences n’ont pas été transmises.

Les durées de vie simulées, la démographie et les vitesses temporelles restent à définir. Un premier prototype peut utiliser une population fixe avant d’introduire le renouvellement générationnel.

## 5. Besoins, métiers, personnalités et décisions

### 5.1 Besoins

Les habitants doivent arbitrer entre leurs besoins et les obligations collectives. Les catégories proposées sont l’eau, la nourriture, le sommeil, la santé, la sécurité, les relations sociales, l’autonomie et le sentiment de justice.

Les besoins matériels dépendent des systèmes physiques. Les besoins sociaux dépendent aussi des interactions, des règles et de la perception des événements.

Un manque peut avoir plusieurs conséquences : baisse de productivité, recherche d’une ressource, absence au travail, sollicitation d’un proche, colère ou changement d’opinion. Ces conséquences doivent dépendre du contexte et de l’individu.

### 5.2 Métiers et compétences

Les métiers relient la population au fonctionnement du silo : maintenance, production alimentaire, traitement de l’eau, énergie, ventilation, transport, soins, sécurité ou administration.

Le métier d’un habitant est visible sous forme de texte dans l’interface, avec des icônes pour ses besoins et son état. Cette lisibilité est explicitement voulue dans le concept.

**Proposition de fonctionnement :** distinguer la fonction attribuée, la compétence réelle et la volonté de travailler. Affecter quelqu’un à une installation ne garantit ni sa qualification ni son obéissance.

#### 5.2.1 Catalogue de métiers

**Proposition de conception détaillée :** un métier définit un ensemble de tâches et de compétences, pas une production automatique. Un habitant peut avoir une spécialité principale et des compétences secondaires. Les intitulés ci-dessous ne fixent ni les effectifs ni la hiérarchie sociale.

| Métier ou spécialité | Tâches concrètes | Lieux, moyens et effets d’un manque de personnel |
|---|---|---|
| Agriculteur / agricultrice | Semer, suivre les cultures, irriguer, récolter, préparer les semences | Espaces agricoles ; outils, eau, nutriments ; retards et pertes de récolte |
| Opérateur / opératrice d’une filière alimentaire | Entretenir une production complémentaire définie par le scénario | Installation spécialisée ; intrants et savoir-faire propres ; recul de la diversité alimentaire |
| Cuisinier / cuisinière | Préparer les repas, organiser les quantités et gérer les réserves de cuisine | Cuisine ; aliments, eau, énergie ; repas retardés ou distribution dégradée |
| Agent / agente de distribution | Servir les repas ou les rations et gérer les files | Réfectoires et points de distribution ; livraisons et règles d’accès ; attente et conflits |
| Technicien / technicienne de l’eau | Contrôler les réservoirs, piloter le traitement, diagnostiquer les anomalies | Traitement et pompage ; instruments, consommables et énergie ; qualité ou disponibilité dégradée |
| Plombier / plombière | Localiser les fuites, remplacer les vannes, réparer les conduites | Réseau d’eau ; outils et pièces ; pertes et interruptions locales |
| Opérateur / opératrice énergie | Surveiller la génération, équilibrer l’alimentation et exécuter les procédures d’arrêt | Centrale et commandes ; source primaire et équipements ; déficit de production |
| Électricien / électricienne | Réparer les câbles et tableaux, isoler un défaut, rétablir une alimentation | Distribution électrique ; pièces et accès autorisés ; coupures prolongées |
| Technicien / technicienne ventilation | Inspecter les ventilateurs, remplacer les filtres et vérifier les circuits | Installations d’air ; énergie et consommables ; dégradation de l’air dans certains secteurs |
| Mécanicien / mécanicienne | Diagnostiquer et réparer pompes, moteurs, portes et machines | Atelier ou installation ; outils, plans et pièces ; entretien reporté et pannes en cascade |
| Fabricant / fabricante de pièces | Usiner, assembler, contrôler et remettre en état certains composants | Atelier de fabrication ; matériaux, outillage et énergie ; dépendance aux stocks anciens |
| Logisticien / logisticienne | Planifier les livraisons et arbitrer les priorités d’acheminement | Dépôts et relais ; informations de stocks et itinéraires ; ruptures locales malgré des réserves globales |
| Magasinier / magasinière | Réceptionner, ranger, inventorier et préparer les sorties | Entrepôts ; contenants et registres ; pertes, erreurs et mauvaise disponibilité des biens |
| Porteur / porteuse | Transporter les biens entre locaux et niveaux | Coursives, passerelles et escalier ; capacité de charge et endurance ; retards et engorgement |
| Agent / agente de propreté et d’assainissement | Nettoyer les espaces, entretenir les sanitaires et collecter les déchets | Quartiers et services ; eau, produits et protections ; salubrité dégradée |
| Agent / agente de recyclage | Trier, démonter et récupérer les matières réutilisables | Zone de recyclage ; outils et énergie ; accumulation de déchets et moindre récupération |
| Médecin | Examiner, orienter les soins et suivre les cas complexes | Infirmerie ; compétence, fournitures et locaux ; besoins de soins non satisfaits |
| Infirmier / infirmière | Assurer les soins courants et le suivi des patients | Services de santé ; fournitures, eau et temps disponible ; attentes et fatigue des équipes |
| Préparateur / préparatrice en pharmacie | Gérer les fournitures, les stocks et les préparations autorisées par le modèle | Pharmacie ; produits disponibles et procédures ; ruptures ou pertes de produits |
| Enseignant / enseignante et formateur / formatrice | Enseigner, organiser les apprentissages et accompagner une spécialisation | Classes et ateliers ; supports, temps et maîtres compétents ; perte de savoir à long terme |
| Archiviste | Conserver les plans, les registres et les récits ; faciliter leur consultation | Archives ; supports et accès ; connaissances indisponibles ou perdues |
| Technicien / technicienne communications | Réparer les relais, interphones, terminaux et caméras | Réseau de communication ; outils, pièces et énergie ; information interrompue ou retardée |
| Agent / agente de sécurité | Patrouiller, contrôler les accès et intervenir selon les règles | Postes et lieux d’intervention ; ordres, équipement et coopération ; accès non maîtrisés ou conflits |
| Agent / agente administratif | Tenir les registres, traiter les affectations et préparer les arbitrages | Administration ; informations et communications ; décisions retardées ou fondées sur des données incomplètes |
| Artisan / artisane des biens courants | Réparer vêtements, mobilier et objets du quotidien | Petits ateliers ; textiles, matériaux et outils ; usure des biens et confort dégradé |

Les fonctions de **maire, chef de section, représentant d’un groupe ou membre d’un conseil** relèvent de l’autorité et de l’organisation collective. Elles doivent être distinguées d’une compétence professionnelle. La Voix constitue un rôle de décision spécifique ; « rebelle » ou « protecteur » décrit une position politique, pas un métier.

#### 5.2.2 Affectations et journées de travail

Une affectation relie une personne à un lieu, une fonction, une période de travail et une liste de tâches. Une journée peut comprendre le trajet, la prise de poste, la préparation, le travail effectif, les pauses, la transmission à l’équipe suivante et le retour.

L’activité dépend de la présence réelle, des compétences, de la fatigue, des outils, des stocks et de la coopération. Les services continus peuvent utiliser des équipes qui se relaient. Une absence, une grève ou un déplacement bloqué ne doit pas être traité comme une présence productive.

La population totale ne correspond pas à la main-d’œuvre disponible : enfants, personnes en formation, malades, retraités et personnes momentanément indisponibles doivent être pris en compte. Leurs contributions peuvent varier selon les règles et les capacités du modèle, sans supposer que chaque habitant occupe un poste permanent.

#### 5.2.3 Compétences et remplacement

Les compétences s’acquièrent par la formation et la pratique. Une tâche peut exiger un niveau minimal, bénéficier d’une supervision ou être impossible pour une personne non formée. Un remplacement non qualifié doit avoir des conséquences cohérentes sur la durée, la qualité et le risque d’erreur.

La polyvalence et l’apprentissage rendent le silo moins dépendant d’une personne unique. Le départ ou le décès du seul spécialiste d’une installation peut interrompre une capacité, même si tous les équipements restent intacts.

#### 5.2.4 Une tâche de maintenance complète

**Exemple de fonctionnement :** une pompe présente un défaut. Le signal doit être détecté puis transmis. Un technicien reçoit ou choisit une intervention, cherche les outils et la pièce nécessaire, rejoint l’installation par un chemin accessible et prépare l’arrêt local si nécessaire. Il effectue la réparation puis vérifie le résultat. Si la pièce manque, il peut chercher une autre source, solliciter l’atelier ou reporter le travail selon ses possibilités et ses priorités.

Cette chaîne donne un rôle effectif aux différents métiers. Un magasinier, un porteur et un mécanicien peuvent participer à la même intervention sans exercer la même tâche.

### 5.3 Personnalités

Les personnalités introduisent des différences durables entre habitants. Des traits comme la prudence, la sociabilité, la solidarité, l’ambition ou la sensibilité à l’injustice peuvent modifier les priorités et les réactions.

Ces traits ne doivent pas prédéterminer mécaniquement une faction. Une personne prudente peut soutenir l’ordre établi, rejoindre une contestation après une répression ou chercher une médiation.

### 5.4 Décisions algorithmiques

**Proposition technique :** chaque habitant dispose d’actions admissibles auxquelles le moteur attribue une priorité selon ses besoins, ses objectifs, ses relations, ses connaissances et ses contraintes.

Une boucle de décision peut suivre cette logique :

1. Mettre à jour l’état et les informations reçues.
2. Identifier les besoins urgents et les engagements en cours.
3. Évaluer les actions possibles.
4. Choisir une action et tenter de l’exécuter.
5. Enregistrer ses conséquences matérielles et sociales.

Une intention n’est pas une réussite. Vouloir réparer une pompe suppose de pouvoir l’atteindre, de disposer des pièces et de ne pas être empêché d’agir.

## 6. Relations et mémoire collective

### 6.1 Relations persistantes

Les relations durables entre habitants sont un choix explicitement confirmé. Elles doivent survivre aux changements de lieu, de métier ou de contexte immédiat.

**Dimensions possibles :** parenté, amitié, confiance, attachement, rivalité, dette, reconnaissance, peur ou ressentiment. Une relation peut être asymétrique : faire confiance à quelqu’un ne signifie pas que cette personne accorde la même confiance en retour.

Ces liens influencent l’entraide, la circulation des informations, la coopération au travail, les engagements collectifs et les réactions aux violences.

### 6.2 Mémoire individuelle

Un habitant ne retient pas nécessairement chaque détail, mais les événements significatifs doivent laisser des traces : avoir été secouru, puni, privé de ressources, trahi ou témoin d’un abus.

**Proposition :** stocker des souvenirs sélectionnés selon leur importance, leur ancienneté et leur portée émotionnelle. Cela évite de conserver un historique exhaustif dans chaque individu tout en maintenant une continuité comportementale.

### 6.3 Mémoire intergénérationnelle

Les nouvelles générations héritent d’une histoire sans avoir vécu tous les événements qui l’ont produite. La transmission peut passer par les familles, les métiers, les institutions, les récits politiques et les archives.

Une révolte réprimée peut devenir une référence familiale. Une ancienne catastrophe technique peut justifier une règle encore appliquée longtemps après. Une compétence ou une connaissance peut disparaître si aucun canal ne la transmet.

Il faut distinguer **ce qui s’est produit**, **ce dont quelqu’un se souvient** et **le récit transmis aux autres**. Cette distinction permet des mémoires concurrentes et des désaccords durables.

## 7. Ressources et réseaux physiques

### 7.1 Stocks, flux et capacités

Une ressource possède une localisation, un stock disponible, des entrées, des sorties et, selon sa nature, une capacité de stockage ou de transfert.

Le bilan élémentaire est :

`stock suivant = stock actuel + entrées − sorties − pertes`

Les quantités transférées doivent respecter la disponibilité et les capacités des installations. Les unités et les pas de temps seront fixés lors de l’implémentation.

**Ressources proposées :** eau utilisable, nourriture, énergie disponible, consommables, pièces détachées et matières de réparation. Pour l’air, la première version peut modéliser une qualité ou une capacité de renouvellement avant d’introduire une composition détaillée.

### 7.2 Réseaux indispensables

| Réseau | Fonction | Conséquences possibles d’une interruption |
|---|---|---|
| Eau | Acheminement, distribution, stockage, traitement | Pénuries locales, problèmes sanitaires, arrêt d’activités |
| Électricité | Alimentation des équipements | Éclairage réduit, machines arrêtées, capteurs indisponibles |
| Air | Ventilation, renouvellement, filtration | Dégradation des conditions de vie, secteurs inhabitables |
| Communications | Ordres, alertes, rapports et échanges | Isolement, retards, rumeurs et perte de coordination |
| Transports | Déplacement des personnes et des biens | Retards, enclavement, accès impossible aux installations |

Les réseaux peuvent être représentés par des nœuds et des liaisons, avec des capacités, des états de fonctionnement et des dépendances.

### 7.3 Dépendances croisées

Une pompe peut dépendre de l’électricité. Une centrale peut dépendre d’un approvisionnement et d’une équipe de maintenance. Une équipe peut être bloquée par un passage fermé. Un responsable peut ignorer la panne si les communications sont interrompues.

Ces dépendances donnent une profondeur au système sans exiger d’emblée une simulation physique de haute précision.

### 7.4 Portes et coupures de courant

Le concept prévoit qu’une coupure électrique puisse empêcher la Voix de fermer certaines portes. Ce mécanisme doit être défini équipement par équipement.

**Proposition :** chaque porte possède un mode en cas de perte de courant — maintien dans l’état actuel, ouverture de sécurité, fermeture de sécurité ou fonctionnement sur réserve. Une coupure devient ainsi une action tactique dont les effets sont prévisibles selon les connaissances disponibles.

Couper le courant peut également interrompre une pompe, des communications ou la ventilation. Les effets collatéraux proviennent des dépendances du réseau concerné.

### 7.5 Entretien et fragilité

**Proposition :** l’usure, le manque de personnel qualifié, les réparations reportées et les pénuries de pièces augmentent progressivement les risques. La dégradation prépare une panne au lieu de la faire surgir sans antécédent.

### 7.6 Catalogue des ressources et états à suivre

**Proposition de conception détaillée :** le modèle distingue les biens stockables, les flux et les capacités de service. Tout ne doit pas être résumé par un stock global unique.

| Ressource ou grandeur | Représentation proposée | Origine, usage et contraintes |
|---|---|---|
| Eau brute et eau traitée | Stocks et transferts séparés, par exemple en litres | Captage ou réserve selon le scénario, puis traitement ; consommation, cuisine et autres usages selon leur qualité requise |
| Eaux usées | Stock ou flux à traiter | Produites par les usages ; récupération partielle, traitement et résidus |
| Aliments bruts | Lots par famille, quantité et état de conservation | Récoltes ou filières spécialisées ; préparation, distribution, consommation et pertes |
| Repas et rations | Lots disponibles localement | Produits à partir d’aliments ; consommés par les habitants ; durée de conservation et règles d’accès |
| Semences et nutriments | Stocks d’intrants agricoles | Réserves, multiplication et récupération selon les filières ; leur absence peut compromettre une récolte future |
| Puissance électrique | Production, demande et capacité de transport, par exemple en kW | Grandeur instantanée du réseau ; un stock d’énergie ne remplace pas une puissance de distribution insuffisante |
| Énergie stockée | Réserve, par exemple en kWh, et limites de charge/décharge | Présente uniquement si un équipement de stockage existe ; pertes et puissance maximale à respecter |
| Source primaire d’énergie | Approvisionnement ou potentiel propre au scénario | Combustible, ressource thermique ou autre dispositif choisi ; aucune centrale ne doit produire sans source définie |
| Qualité de l’air et ventilation | État local et capacité de renouvellement ou de traitement | Dépendent des occupants, des activités, des échanges entre secteurs et des installations ; ventilation et régénération ne sont pas équivalentes |
| Filtres et consommables techniques | Stocks et usure | Utilisés par le traitement de l’air ou de l’eau ; production locale éventuelle à définir |
| Pièces détachées | Stocks par famille et compatibilité | Réserves, fabrication ou récupération ; une pièce disponible n’est pas nécessairement adaptée à la machine en panne |
| Matières de fabrication | Métaux, polymères et autres matières utiles, regroupés au besoin | Stocks initiaux et recyclage selon le scénario ; fabrication de pièces, d’objets et de réparations |
| Outils et machines d’atelier | Équipements réutilisables avec état et disponibilité | Nécessaires aux tâches ; peuvent être occupés, déplacés, usés ou indisponibles |
| Fournitures médicales et d’hygiène | Stocks différenciés, conservation et consommations | Réserves et filières de production définies ; disponibilité limitée sans fabrication miraculeuse |
| Textiles et biens courants | Objets ou lots avec usure | Vêtements, literie et mobilier ; fabrication, réparation, réaffectation et récupération |
| Déchets organiques, eaux de rejet et résidus solides | Flux et stocks par filière | Collectés, traités, récupérés ou stockés ; saturation et pertes à modéliser |
| Capacité de transport | Charge, temps, disponibilité des porteurs et capacité des chemins | Service limité par les personnes, les trajets, les escaliers et les files d’attente |
| Information technique | Plans, messages et registres avec détenteur, localisation et accessibilité | Guide les actions ; transmettre une information n’implique pas de la consommer comme un bien matériel |

Le temps de travail, la compétence, la confiance et la légitimité ne sont pas des matières premières. Ce sont des disponibilités ou des états humains qui conditionnent le fonctionnement des filières.

### 7.7 Chaînes de transformation

Les chaînes suivantes décrivent des mécanismes de jeu à préciser, pas des recettes industrielles chiffrées :

| Filière | Chaîne causale |
|---|---|
| Eau | Source ou réserve → pompage → traitement → stockage local → distribution → usages → collecte → traitement des rejets et récupération partielle |
| Alimentation | Semences et intrants + travail + conditions agricoles → croissance → récolte → stockage → préparation → livraison → consommation → déchets |
| Énergie | Source primaire → génération → distribution → consommation ; stockage facultatif avec pertes et limites de puissance |
| Air | Air local altéré par les activités → circulation et traitement adaptés → amélioration locale ; élimination du CO₂ ou apport d’oxygène uniquement si une filière définie le permet |
| Maintenance | Détection d’un défaut → transmission → diagnostic → approvisionnement → trajet → réparation → contrôle → remise en service |
| Fabrication | Matières disponibles + plans + machines + compétences + énergie → composants compatibles + chutes et déchets |
| Recyclage | Collecte → tri → traitement → matières récupérées utilisables + pertes + résidus à gérer |

Les cycles ne sont pas parfaits : consommation, pertes, usure et matières non récupérables doivent rester visibles. Un silo autonome a besoin de sources, de réserves ou de filières de régénération explicitement définies. L’approvisionnement initial et les possibilités de renouvellement dépendent du scénario.

### 7.8 Production, stockage et acheminement

Pour chaque activité productive, la fiche de fonctionnement précise : intrants, sorties, durée, équipement, compétence nécessaire, capacité, énergie et raccordements. La production réalisée est limitée par le maillon manquant : une machine sans opérateur, un atelier sans matière ou une récolte non transportée ne deviennent pas des ressources utilisables à distance.

Chaque stock possède une localisation, une capacité, des quantités disponibles et réservées, des conditions d’accès et des pertes éventuelles. Un outil peut être prêté plutôt que consommé ; une pièce peut être installée puis récupérée si son état le permet. Les réservations évitent que deux tâches s’attribuent simultanément le même objet ou le même lot.

**Exemple :** le silo possède encore de la nourriture dans un dépôt, mais le portage est interrompu par une passerelle bloquée. Le réfectoire d’un secteur épuise ses réserves locales. Il y a alors une pénurie locale malgré un stock global positif. Un reroutage n’est possible que s’il existe un autre chemin et des personnes disponibles pour l’emprunter.

Les règles de rationnement, de priorité et de réquisition influencent la distribution. Le moteur doit distinguer l’épuisement réel d’une ressource, son inaccessibilité physique et une interdiction d’accès décidée par une autorité.

### 7.9 Lecture des pénuries et crises de filière

L’interface doit permettre, selon les informations accessibles au rôle, de distinguer :

- le stock présent, le stock réservé et le stock effectivement accessible ;
- le débit produit, le débit consommé et le débit réellement distribué ;
- une insuffisance de production, de traitement, de stockage ou de transport ;
- un manque de matériel, de compétences, de personnel ou de coopération ;
- les secteurs touchés et les conséquences déjà observées.

**Exemple de crise transversale :** un filtre manque, le traitement de l’eau ralentit, certains usages sont rationnés, l’irrigation reçoit moins d’eau et une récolte est retardée. L’équipe de cuisine adapte les repas, les porteurs modifient leurs livraisons et les habitants interprètent les choix de distribution. Les effets sociaux proviennent de cette chaîne et des expériences individuelles ; ils ne doivent pas être déclenchés automatiquement par un seul seuil de stock.

## 8. Politique émergente et auras

### 8.1 Des positions qui évoluent

La politique émerge des conditions de vie, des relations, des informations reçues et des expériences vécues. La confiance dans l’autorité, la volonté de contester ou le désir de protéger l’ordre peuvent évoluer.

Les catégories citées incluent notamment les **rebelles** et les **protecteurs**. D’autres positions — indécision, recherche de compromis, opportunisme — sont des extensions possibles, pas une nomenclature définitivement fixée.

### 8.2 Auras lisibles

L’aura d’un habitant sert à rendre sa tendance politique lisible visuellement. Le métier reste identifiable séparément et les besoins apparaissent sous forme d’icônes.

**Proposition d’encodage :** couleur pour la tendance, intensité pour l’engagement et marque supplémentaire pour une responsabilité particulière. Les couleurs devront être complétées par des symboles ou libellés accessibles.

L’aura doit respecter le mode de jeu : un observateur omniscient peut connaître une affiliation réelle ; un habitant ou un responsable peut ne voir que l’appartenance déclarée, un soupçon ou une information inconnue. Afficher toutes les opinions cachées contredirait le brouillard d’information.

### 8.3 Influence et factions

**Proposition :** les factions se forment et se consolident par les relations, les expériences partagées, les lieux de travail et les communications. Leur cohésion dépend de la confiance et d’objectifs suffisamment communs.

Le statut administratif, la popularité et le pouvoir réel sont distincts. Un responsable peut perdre l’obéissance d’une équipe, tandis qu’une personne sans titre devient centrale parce qu’elle coordonne un réseau d’entraide ou maîtrise une installation.

## 9. La Voix : algorithme puis IA optionnelle

### 9.1 Rôle de la Voix

La Voix représente une autorité supérieure capable d’imposer des règles et d’agir sur le silo dans les limites de ses moyens. Les possibilités explicitement évoquées comprennent l’ouverture du silo et son extinction.

Le terme **extinction** demande encore une définition précise dans les règles : arrêt organisé des systèmes, condamnation d’un silo ou autre procédure. Il doit désigner une action explicite avec des préconditions et des conséquences simulées, pas un effet arbitraire sans mécanisme.

### 9.2 Première étape : Voix algorithmique

La Voix peut utiliser des seuils, des priorités et des politiques configurables. Elle observe les informations accessibles, choisit une action autorisée et en reçoit le résultat.

**Exemples de politiques à expérimenter :** préserver les systèmes vitaux, maintenir l’ordre, rationner en cas de manque ou isoler un secteur. Les objectifs exacts et leurs arbitrages restent à définir.

### 9.3 Deuxième étape : IA optionnelle

Une IA peut ensuite remplacer le décideur algorithmique de la Voix. Elle ne remplace pas le moteur du monde.

**Architecture proposée :**

1. Le moteur prépare une observation correspondant aux accès de la Voix.
2. Le décideur reçoit les actions disponibles et leurs paramètres.
3. Il propose une action structurée.
4. Le moteur vérifie les droits et les conditions physiques.
5. La simulation exécute ce qui est possible et enregistre le résultat.

La Voix, algorithmique ou IA, ne peut fermer une porte inaccessible à son système de commande, recevoir l’image d’une caméra hors service ou obtenir automatiquement l’obéissance d’un habitant.

### 9.4 Comparaison des variantes

Conserver une interface de décision commune permet de comparer une Voix algorithmique, une Voix jouée par un humain et une Voix pilotée par IA.

La simulation doit rester utilisable sans IA. La disponibilité d’un service externe ne doit pas conditionner les besoins, les métiers, les relations ou les réseaux physiques.

## 10. Modes de joueur

Les modes partagent un même monde simulé, mais donnent accès à des informations, des responsabilités et des moyens d’action différents.

| Mode | Place du joueur | Actions ou contraintes caractéristiques |
|---|---|---|
| Observateur | Suit l’évolution autonome | Observe les causes, les trajectoires et les indicateurs selon le niveau d’accès choisi |
| Validation des actions | Autorise ou refuse certaines actions proposées par les habitants | Le périmètre des validations doit être configurable pour éviter une charge excessive |
| Chef de section | Dirige un secteur ou une activité | Organise les affectations et gère les difficultés locales dans les limites de son autorité |
| Maire | Gouverne la société du silo | Arbitre les politiques, les ressources et les rapports avec les groupes |
| Voix | Incarne l’autorité supérieure | Impose des règles et commande les équipements auxquels elle a accès |
| Contrôle de plusieurs silos | Suit plusieurs sociétés | Compare les trajectoires et intervient selon les pouvoirs accordés par le scénario |
| Acteur du renversement | Participe à la contestation | Cherche des soutiens et agit sur les infrastructures et les points stratégiques |

Le mode de renversement découle explicitement de l’idée que le joueur puisse être l’acteur d’une révolte contre la Voix. Le degré d’incarnation — individu précis ou contrôle d’un groupe — reste ouvert.

Les modes ne nécessitent pas des moteurs séparés : ils correspondent surtout à des règles d’accès, d’observation et d’intervention différentes.

## 11. Révolutions et contrôle territorial

### 11.1 Une révolte comme processus

Le peuple peut se retourner contre la Voix, qu’elle soit algorithmique ou pilotée par IA. Le joueur peut contribuer à ce basculement.

**Progression possible :** mécontentement, entraide locale, circulation de récits communs, coordination, refus d’obéir, grèves, occupation de lieux et confrontation. Cette progression n’est pas une séquence obligatoire : une contestation peut s’éteindre, se diviser ou obtenir une concession.

### 11.2 Le territoire comme source de pouvoir

Le contrôle territorial doit avoir des effets concrets. Occuper une centrale, une réserve, un poste de communication ou un passage peut modifier les possibilités d’action de plusieurs groupes.

**Proposition de modèle :** distinguer pour chaque zone l’accès physique, la présence organisée, le contrôle des commandes et l’obéissance du personnel. Une zone peut rester contestée ; la présence d’un seul individu ne suffit pas nécessairement à en prendre le contrôle.

### 11.3 Actions matérielles et sociales

Les acteurs peuvent chercher à :

- convaincre des personnes et obtenir leur coopération ;
- protéger ou occuper une installation ;
- interrompre un réseau ou en rétablir le fonctionnement ;
- ouvrir un passage ou empêcher sa fermeture ;
- diffuser des informations et contester un récit officiel ;
- maintenir les services vitaux pendant une crise.

Les formes de combat, les moyens de sécurité et la résolution des affrontements restent à concevoir. Ils doivent respecter les mêmes contraintes spatiales et matérielles que le reste de la simulation.

### 11.4 Après le renversement

Une révolution ne réinitialise pas la société. Les pertes, les installations endommagées, les fidélités, les rancœurs et les souvenirs persistent. Le nouveau pouvoir doit encore assurer l’approvisionnement, la maintenance et une coopération suffisante.

## 12. Brouillard d’information

### 12.1 Plusieurs formes de connaissance

Le brouillard dépend du rôle du joueur, de sa présence, de sa connaissance des lieux et des caméras disponibles.

**États proposés pour un secteur :**

- inconnu ;
- connu par son plan ou une visite ancienne ;
- observé actuellement ;
- connu seulement par un rapport daté ;
- inaccessible ou coupé des communications.

Connaître l’existence d’une salle ne donne pas son état actuel. Connaître un rapport ne garantit pas qu’il soit complet ou encore valable.

### 12.2 Caméras et communications

Une caméra est un équipement situé dans le monde. Son image dépend de sa couverture, de son alimentation, de sa liaison et des droits d’accès.

Une interruption peut supprimer la vision en direct tout en laissant disponible une dernière observation datée. Une zone hors caméra peut être connue par un habitant qui s’y trouve ou par un message qu’il transmet.

### 12.3 Connaissance propre aux individus

Les habitants prennent leurs décisions à partir de ce qu’ils savent. Ils ne doivent pas réagir automatiquement à une panne ou à un événement dont aucune information ne leur est parvenue.

**Proposition :** accompagner les informations d’une origine, d’une date et éventuellement d’un niveau de confiance. Les rumeurs et les rapports deviennent alors des objets de simulation, avec des retards et des erreurs possibles.

### 12.4 Accès d’analyse et accès de jeu

Un mode d’observation ou de diagnostic peut révéler la vérité complète pour expliquer et vérifier le fonctionnement du moteur. Les modes incarnés appliquent les limites de connaissance de leur rôle.

Cette distinction vaut pour les cartes, les indicateurs, les alertes et les auras politiques.

## 13. Événements causaux et histoires émergentes

### 13.1 Des crises issues du système

Un événement doit pouvoir être expliqué par une chaîne de causes : usure, pénurie, décision politique, accident, conflit ou combinaison de facteurs.

Les événements externes restent possibles, mais leurs conditions et leur calendrier doivent être définis dans le scénario ou produits par un mécanisme aléatoire enregistré.

### 13.2 Exemple illustratif : de la maintenance à la contestation

Cet exemple décrit une trajectoire possible, pas un scénario imposé :

1. Une équipe manque de pièces et reporte l’entretien d’une pompe.
2. L’installation tombe en panne et réduit l’approvisionnement d’un secteur.
3. La distribution restante est perçue comme injuste.
4. Des habitants sollicitent leurs proches et organisent une entraide.
5. L’autorité interdit un rassemblement ; certains agents refusent d’appliquer l’ordre.
6. Les contestataires occupent un passage et coupent une alimentation de commande.
7. Certaines portes ne peuvent plus être fermées à distance.
8. La crise se résout par réparation, négociation, répression ou changement de pouvoir selon les actes des participants.

### 13.3 Exemple illustratif : héritage d’une crise

Une personne secourue pendant une panne conserve de la gratitude envers une équipe. Des proches transmettent ensuite le récit de cet épisode. Une génération plus tard, ce souvenir peut encore influencer la confiance accordée à un métier ou à une institution.

### 13.4 Explicabilité

**Proposition :** un journal relie les événements importants à leurs causes et à leurs effets. Le mode d’analyse permet de comprendre pourquoi une personne a changé d’avis ou pourquoi une installation s’est arrêtée. Le joueur en situation ne reçoit que les explications auxquelles son rôle donne accès.

## 14. Interface minimaliste et flux lumineux

### 14.1 Lire une société sans ouvrir des dizaines de fenêtres

L’interface privilégie une représentation simple du silo et des habitants. Les informations essentielles apparaissent directement : métier sous forme de texte, besoins et états sous forme d’icônes, tendance politique sous forme d’aura lorsque cette information est connue.

La sélection d’une personne ou d’une installation révèle les détails utiles : activité, relations, souvenirs significatifs, dépendances et incidents.

### 14.2 Flux lumineux

Les flux lumineux servent à rendre visibles les échanges et l’activité des réseaux.

**Proposition visuelle :** des impulsions ou des traits animés montrent le sens de circulation, l’activité, une saturation ou une interruption. Chaque réseau possède un code visuel identifiable. Des symboles et motifs complètent la couleur.

Ces effets représentent les valeurs calculées par la simulation. Une animation abondante ne doit pas laisser croire qu’une ressource circule quand le réseau est interrompu.

L’affichage des flux doit aussi respecter l’information disponible : le joueur ne voit pas automatiquement l’état précis d’une canalisation inconnue ou non instrumentée.

### 14.3 Calques et niveaux de détail

**Calques proposés :** population, métiers, besoins, politique, eau, électricité, air, communications, transports et contrôle territorial.

À l’échelle du silo, l’interface privilégie les tendances et les incidents majeurs. En se rapprochant, elle montre les individus et les équipements. Les 2 000 entités persistent indépendamment de cette sélection visuelle.

### 14.4 Temps et suivi

**Fonctions proposées :** pause, vitesses réglables, suivi d’un individu, alertes hiérarchisées et consultation d’événements. Un accès chronologique détaillé est particulièrement utile au mode d’observation et aux expériences.

### 14.5 Direction visuelle

La direction actuelle évolue vers une **3D plus réaliste**, avec des volumes plutôt anguleux, du béton, de l’acier, des équipements utilitaires et des personnages aux proportions naturelles. La couleur conserve une fonction de repérage dans les vêtements, le mobilier, les métiers et la signalétique, avec une saturation modérée. L’éclairage et les ombres doivent donner du relief tout en laissant les espaces et les activités lisibles.

L’aspect définitif reste à affiner. Les personnages, les textures, le mobilier et les lumières des maquettes servent à explorer la direction artistique ; leur niveau de finition ne représente pas une cible finale validée.

### 14.6 Maquette interactive de référence

Une maquette Three.js permet déjà de parcourir le puits central, d’isoler un étage et d’avancer dans une artère de 30 mètres. La variante qui intègre le noyau central, les marches en éventail et les passerelles est conservée dans le projet sous `maquettes/silo-escalier-central.html`.

Les 24 niveaux, les dimensions de l’escalier et les habitants animés de cette maquette sont illustratifs. Ils servent à évaluer la disposition et la navigation. Ils ne constituent ni la simulation sociale complète, ni une validation des capacités du moteur à l’échelle finale. La longueur de 30 mètres représente ici une hypothèse de limite d’excavation ; son origine, son point de mesure et les éventuelles galeries voisines restent à préciser dans les règles du jeu.

## 15. Architecture : simulation et rendu

**Three.js est la direction technique retenue pour le rendu 3D et les prototypes interactifs.** Le moteur de simulation reste séparé de cette couche de présentation. Les choix détaillés de programmation, de stockage et de plateforme cible restent à préciser.

### 15.1 Séparer le monde de sa représentation

Le moteur conserve l’état des habitants, des lieux, des relations, des ressources, des réseaux et des autorités. Le rendu affiche une vue de cet état, filtrée selon le rôle.

La simulation doit pouvoir fonctionner sans affichage. Cela permet les essais prolongés et les comparaisons entre scénarios.

### 15.2 Trois couches conceptuelles

| Couche | Responsabilité |
|---|---|
| Simulation | État réel, règles, décisions, ressources, déplacements et événements |
| Observation et contrôle | Informations accessibles et commandes autorisées selon le rôle |
| Présentation | Carte, habitants visibles, icônes, auras, flux et panneaux |

La Voix accède elle aussi au monde par une interface d’observation et de commande. Cela permet de conserver les mêmes contraintes pour les décideurs algorithmiques, humains ou IA.

### 15.3 Gérer 2 000 entités

**Pistes d’optimisation proposées :**

- dessiner uniquement les éléments pertinents pour la vue et le rôle ;
- répartir les décisions individuelles dans le temps ;
- mettre à jour certains états lors d’événements plutôt qu’en permanence ;
- utiliser un index spatial pour limiter les recherches de proximité ;
- recalculer les trajets et les réseaux seulement quand leur état le justifie ;
- conserver un graphe social de liens significatifs, sans relation détaillée obligatoire entre toutes les paires d’habitants.

La fréquence des calculs peut dépendre de la nature d’un système, mais ne doit pas dépendre de ce qui est visible au point de modifier les résultats lorsque le joueur déplace la caméra.

### 15.4 Pas de simulation et ordre de résolution

Un pas de simulation stable est une option adaptée à la reproductibilité. L’ordre des mises à jour doit être explicite pour éviter que certains habitants bénéficient systématiquement d’un traitement prioritaire non voulu.

Les valeurs temporelles, le niveau de précision physique et le budget de performance seront choisis à partir de mesures. Le nombre de 2 000 entités est un objectif fonctionnel ; il ne prouve pas à lui seul une performance sur un matériel donné.

### 15.5 Sauvegarde

Une sauvegarde doit préserver l’état du monde, les identités, les relations, les mémoires utiles, les commandes différées et l’état du générateur aléatoire. Recharger doit permettre une continuation cohérente.

## 16. Expériences reproductibles

### 16.1 Le silo comme laboratoire social

Le projet permet de comparer des sociétés soumises à des conditions contrôlées : politiques différentes, niveaux d’inégalité, fragilité des réseaux ou accès à l’information.

Les résultats décrivent le comportement du modèle construit. Ils ne constituent pas, à eux seuls, des conclusions générales sur les sociétés réelles.

### 16.2 Paramètres à conserver

**Proposition de fiche d’expérience :**

- version du moteur et des règles ;
- configuration et état initial complet ;
- graine et état des mécanismes aléatoires ;
- politiques et paramètres des décideurs ;
- chronologie des interventions du joueur ;
- éventuelles observations et décisions enregistrées de la Voix IA ;
- critères de fin et indicateurs mesurés.

Une graine seule ne suffit pas si l’ordre de calcul, les règles ou les entrées externes changent.

### 16.3 Mesures proposées

| Domaine | Indicateurs possibles |
|---|---|
| Survie | Population, santé, mortalité, besoins insatisfaits |
| Infrastructures | Pannes, disponibilité, retards de maintenance, résilience |
| Ressources | Stocks, déficits, pertes et inégalités d’accès |
| Société | Confiance, coopération, liens, polarisation |
| Politique | Légitimité, obéissance, mobilisations et zones contrôlées |
| Transmission | Compétences conservées, connaissances perdues, souvenirs transmis |

La stabilité politique n’est pas automatiquement synonyme de bien-être. Les indicateurs doivent permettre de voir les compromis plutôt que de réduire toute la simulation à un score unique.

### 16.4 Hasard et IA

Pour comparer des politiques, il est utile de répéter les expériences sur plusieurs graines. Une divergence entre deux parties peut aussi venir de trajectoires aléatoires différentes ; elle ne doit pas être attribuée trop vite à une seule règle.

Une Voix IA peut introduire des sorties variables. Pour rejouer exactement une partie, il faut enregistrer et réinjecter ses décisions. Comparer plusieurs exécutions libres de cette IA est une autre expérience, à distinguer d’une reproduction exacte.

## 17. Feuille de route

La progression ci-dessous est une proposition. Elle vise à vérifier les dépendances du concept avant d’étendre sa complexité. Aucune durée de réalisation n’est fixée.

### Étape 1 — Noyau autonome observable

**Contenu :** un silo simple, une population persistante, des besoins matériels de base, des métiers, des déplacements, quelques stocks et une visualisation minimale dans Three.js. Les parcours doivent intégrer l’escalier central, les paliers et les passerelles. Développement possible sur un effectif réduit, puis montée vers les 2 000 habitants prévus.

**Validation :** la simulation progresse sans joueur ; une personne conserve son identité et son état hors écran ; les variations de ressources sont explicables ; déplacer la vue ne modifie pas les résultats.

### Étape 2 — Réseaux physiques et maintenance

**Contenu :** réseaux d’eau, d’électricité, d’air, de communications et de transports, introduits progressivement ; capacités, dépendances, pannes et réparations.

**Validation :** une coupure produit des effets localisés et cohérents ; les équipements respectent leur comportement défini ; les équipes doivent réellement pouvoir accéder aux interventions.

### Étape 3 — Individus sociaux et transmission

**Contenu :** personnalités, relations persistantes, confiance, souvenirs, puis vieillissement, renouvellement et mémoire intergénérationnelle.

**Validation :** une expérience vécue modifie certains comportements ; les relations perdurent ; une information ou une compétence peut être transmise ou perdue avec ses conséquences.

### Étape 4 — Politique et Voix algorithmique

**Contenu :** opinions, auras, groupes, règles collectives et décideur algorithmique de la Voix.

**Validation :** des politiques différentes produisent des trajectoires explicables ; l’autorité agit par des moyens simulés ; un changement de loyauté découle de mécanismes observables.

### Étape 5 — Rôles et information limitée

**Contenu :** droits d’accès, connaissances des lieux, caméras, rapports, interface filtrée, modes chef de section, maire, Voix et validation d’actions.

**Validation :** deux rôles obtiennent des vues différentes du même monde ; une caméra ou une communication coupée réduit réellement l’information accessible.

### Étape 6 — Contestation et contrôle territorial

**Contenu :** coordination collective, occupations, obéissance locale, contrôle des installations et mode de renversement.

**Validation :** une contestation peut se développer sans déclencheur narratif obligatoire ; maîtriser un lieu ou un réseau change les possibilités d’action ; les conséquences persistent après une transition de pouvoir.

### Étape 7 — Plusieurs silos et expériences

**Contenu :** configurations égales ou inégales, politiques comparables, exécution sans rendu, sauvegardes et journaux permettant de rejouer les scénarios.

**Validation :** une expérience peut être reproduite dans un environnement maîtrisé ; les différences de conditions sont identifiables ; les mesures permettent une comparaison documentée.

### Étape 8 — Voix IA optionnelle

**Contenu :** raccordement d’un décideur IA à l’interface existante, conservation des observations et des commandes, comparaison avec les autres variantes de Voix.

**Validation :** les contraintes physiques restent appliquées ; le moteur fonctionne avec la Voix algorithmique ; une partie peut être rejouée à partir des décisions enregistrées.

### Travail transversal — Lisibilité et performance

À chaque étape : mesurer les coûts, vérifier la conservation des ressources, observer les causes des événements et améliorer la lisibilité. Le moteur doit être évalué avec 2 000 individus avant de considérer cet objectif comme atteint.

## 18. Décisions ouvertes et critères de réussite

### 18.1 Choix à préciser

- Dimensions du puits, du noyau central, des marches, des passerelles et des artères ; nombre de niveaux et organisation des embranchements.
- Règles de caméra, de coupe et de masquage des éléments pour explorer la profondeur sans perdre la lisibilité.
- Matériaux, modèles de personnages et éclairage définitifs de la direction plus réaliste.
- Niveau de détail physique des réseaux, notamment de l’air et de l’énergie.
- Échelle du temps, démographie et rythme de transmission générationnelle.
- Profondeur des personnalités, des souvenirs et des relations.
- Composition initiale des groupes politiques et conditions de leur émergence.
- Définition des pouvoirs de la Voix, de l’ouverture et de l’extinction du silo.
- Résolution des affrontements et règles de prise de contrôle d’une zone.
- Degré d’incarnation du joueur dans le mode révolutionnaire.
- Modalités de liaison et d’interaction entre silos.
- Conditions de fin : survie, effondrement, objectif de scénario ou simulation ouverte.
- Architecture détaillée du moteur de simulation, langage, plateforme cible et budget de performance du rendu Three.js.
- Définition et mesure de la limite d’excavation de 30 mètres et des relations spatiales entre silos.

### 18.2 Critères de réussite du concept

Le projet réalise sa promesse si :

1. **Le silo vit seul.** Les habitants et les systèmes évoluent sans microgestion permanente.
2. **Les individus comptent.** Les 2 000 habitants ont une continuité et des conséquences propres.
3. **Les relations durent.** Les expériences et les liens influencent l’avenir de la société.
4. **L’histoire se transmet.** Des générations héritent de savoirs, de récits et de conséquences.
5. **Les infrastructures contraignent le pouvoir.** Les ordres dépendent de réseaux, de lieux et de personnes.
6. **La politique peut émerger.** Soutien, opposition et révolte résultent des conditions simulées.
7. **Le rôle change l’expérience.** Les informations et les moyens du joueur varient réellement.
8. **La représentation reste lisible.** Icônes, métiers, auras et flux rendent le monde compréhensible.
9. **Les causes sont inspectables.** Les trajectoires peuvent être expliquées sans tout révéler aux rôles limités.
10. **Les expériences sont comparables.** Configurations, interventions et aléas peuvent être conservés.
11. **L’IA reste facultative.** Le cœur algorithmique fonctionne entièrement sans elle.

---

**Formulation centrale du projet :** une société souterraine autonome, composée d’individus persistants, dans laquelle les besoins, les relations, la mémoire et les infrastructures font émerger des histoires et des rapports de pouvoir que le joueur peut observer ou transformer depuis plusieurs rôles.
