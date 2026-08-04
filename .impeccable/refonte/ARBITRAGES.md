# Registre des arbitrages — refonte structurelle UI-v2

> Décisions prises avec le propriétaire du produit sur la base des planches de
> `.impeccable/refonte/`. Ce fichier est la source de vérité du chantier : quand
> une planche et ce registre divergent, le registre gagne.
>
> Date des arbitrages : 2026-08-04. Cadre méthodologique : plan du chantier
> (skill Impeccable, mode Operate, identité visuelle « Field Register » conservée).

## Ce qui a été décidé, en une phrase

Les neuf familles d'écrans ont retenu leur **piste B** — l'approche alternative —
et le cadre **« Un seul rail »**. La refonte est donc structurelle de bout en
bout : le shell perd une colonne, la navigation passe de huit entrées plates à
sept en trois groupes, et quatre écrans changent de nature (le tableau de bord
devient une file de travail, la liste d'interventions devient des vues
enregistrées, les collections deviennent un explorateur, le workspace devient un
poste de travail guidé).

## Arbitrage n°1 — le cadre (planche `01-vision.html`)

| # | Décision | Choix |
| --- | --- | --- |
| A1 | Cadre du shell | **B « Un seul rail »** : le rail de 60 px disparaît ; l'organisation devient l'en-tête commutable de la barre latérale (popover), l'utilisateur passe dans l'en-tête. Trois colonnes. |
| A2 | Groupes de navigation | **3 groupes visibles** : Operations · Assets · Administration |
| A3 | Bascule d'organisation | **Popover** dans l'en-tête de barre latérale, accessible sur téléphone (elle ne l'était pas) |
| A4 | Barre de commande basse mobile | **Généralisée** à la scène terrain |
| A5 | Recommandations du cadre | Adoptées : libellé « Équipe » · `h1` visible partout · action primaire dans l'en-tête de page · un régime de largeur par gabarit · barre d'outils réduite à recherche et filtres · repli de barre latérale câblé · sous-chemin préservé à la bascule d'organisation · assistant de mise en route tolérant à une panne d'API · refus de permission nommé · toast fermable au clavier et hors de la barre mobile |

## Arbitrage n°2 — cœur métier (planches `02` / `03` / `04`)

| # | Décision | Choix |
| --- | --- | --- |
| B1 | **F1 — atterrissage** | **B « Aujourd'hui »** : quatre files de travail (en retard · renvoyées · à relire · non synchronisées) avec de vraies interventions |
| B2 | F1 — inventaire et tendances | **Page « Statistiques »** dans le groupe Assets ; appels inchangés, déménagés |
| B3 | F1 — libellé | **« Aujourd'hui »** |
| B4 | **F4 — interventions** | **B « Vues de travail »** : vues nommées portant filtres, groupement et rendu ; calendrier replanifiant par dépôt |
| B5 | F4 — persistance des vues | **Cookie, 5 vues maximum** (seul mécanisme existant dans l'application) |
| B6 | **F5 — workspace** | **B « Poste de travail guidé »** : la commande est le sujet de la page, une surface de travail par phase, le rail se dissout |
| B7 | F5 — publication | **Cérémonie adoptée** : le récapitulatif est la surface de confirmation, puis état « inscrit au registre » visiblement en lecture seule |
| B8 | F5 — propriétés | **Surface de page** (édition en place) → amendement ARCHITECTURE.md §10.5 |
| B9 | Recommandations | Adoptées, dont : sélecteur de rendu F4 en `p-selectbutton` · surface de filtres F4 identique aux trois listes voisines · tri exposé · fin du patron « métrique héroïque » · `disabledReason` visible à toutes les largeurs · sections hors phase démontées et non repliées |

## Arbitrage n°3 — gestion (planches `05` / `06` / `07`)

| # | Décision | Choix |
| --- | --- | --- |
| C1 | **F2 — collections** | **B « L'explorateur de patrimoine »** : entrée unique, arborescence des sites, contenu du nœud en onglets, plus un mode « tout à plat » de premier niveau |
| C2 | F2 — inspections | **Entrée de navigation conservée** (recherche par date, résultat, inspecteur), et présentes aussi en onglet d'un nœud |
| C3 | **F3 — fiches** | **B « La fiche est la surface d'édition »** : édition en place, les trois routes `/edit` retirées (redirections conservées) |
| C4 | **F6 — administration** | **B « Un seul centre »** : Membres + Rôles → « Équipe » (3 onglets), permissions lues par personne, réglages en sections ancrées, notifications unifiées |
| C5 | Recommandations | Adoptées, dont : bande d'état nommant sa prochaine action (équipement, inspection) · préférences enregistrées mais non appliquées annoncées comme telles · « introuvable » remplace la page entière · dialogue de quota monté sur les listes |

## Arbitrage n°4 — périphérie (planches `08` / `09` / `10`)

| # | Décision | Choix |
| --- | --- | --- |
| D1 | **F7 — collaboration** | **B « Le fil suit le travail »** : la conversation s'ouvre dans le panneau contextuel ; les routes restent pour le lien profond et la lecture plein écran |
| D2 | F7 — limite du workspace | **Levée** : le workspace d'intervention doit pouvoir héberger une contribution de panneau (il est aujourd'hui la seule route qui ne le peut pas) |
| D3 | **F8 — entrée dans le produit** | **B « Une activation, pas un tunnel »** : les cinq étapes deviennent une liste visible et reprenable ; la vitrine montre le produit au travail |
| D4 | **F9 — pages focalisées** | **B « Une erreur qui sait où l'on est »** : 404 avec sorties déduites de l'URL, 403 nommant la permission manquante, 500 distinguant réseau et panne, invitation en accueil deux volets |
| D5 | Recommandations | Adoptées, dont : bande d'identité identique sur les trois fils de discussion · un seul registre de copie · une seule progression pendant la mise en route · gabarit focalisé unique · aucune donnée inventée dans la vitrine (contrainte RNCP) |

## Navigation résultante

| Groupe | Entrées |
| --- | --- |
| **Operations** | Aujourd'hui · Interventions · Inspections |
| **Assets** | Patrimoine · Statistiques |
| **Administration** | Équipe · Réglages |

Sept entrées en trois groupes visibles, contre huit entrées plates et cinq
groupes déclarés-mais-invisibles. Deux fusions (Sites + Équipements →
Patrimoine ; Membres + Rôles → Équipe), une création (Statistiques), un
renommage (Vue d'ensemble → Aujourd'hui).

## Ronde de cohérence trans-familles

Quatre recoupements apparaissent une fois les neuf choix posés côte à côte. Ils
ne remettent aucune décision en cause ; ils désignent du travail à mutualiser.

1. **L'édition en place est le même geste dans trois familles.** La description
   d'intervention le fait déjà ; F3 l'étend aux champs des fiches, F5 aux
   propriétés du workspace. La règle de trois est satisfaite : c'est une
   primitive partagée, à construire une fois.
2. **Les files d'« Aujourd'hui » et les vues d'interventions sont la même
   notion** à deux échelles : une requête nommée et paramétrée sur les
   interventions. F1 le dit explicitement (« chaque file est une porte vers la
   vue correspondante »). À construire une fois, à consommer deux fois.
3. **F7 dépend d'une levée de limite, pas de F5.** Rendre le workspace capable
   d'héberger une contribution de panneau relève du câblage de fournisseurs, pas
   de la refonte du workspace. C'est donc une tâche de fondation, ce qui libère
   F7 de la dépendance à F5.
4. **Le centre de notifications reste une popover**, pas un onglet du panneau
   contextuel : les notifications sont globales, le panneau est contextuel. F6
   et F7 ne se recouvrent pas.

## Décisions normatives à acter (documents du dépôt)

| Document | Amendement | Motif |
| --- | --- | --- |
| `ARCHITECTURE.md` §10.5 | L'édition d'une ressource peut vivre en **surface de page** plutôt qu'en overlay ; l'overlay reste réservé aux surfaces secondaires et aux confirmations | Décisions B8 et C3 |
| `DESIGN.md` | Déclarer **JetBrains Mono** dans le bloc typographique | La fonte est utilisée par le produit (codes `FG-142`, révisions) et déclarée dans PRODUCT.md, mais absente de DESIGN.md |
| `DESIGN.md` | Consigner les **cinq gabarits de page** et la règle « une seule convention d'action primaire » | Arbitrage A5 |
| `FEATURE.md` concernés | Mise à jour des routes, ports et invariants dans le lot qui les modifie | Règle §14.2 |

## Défauts trouvés et corrigés pendant la phase de conception

Quatre défauts réels ont été découverts en construisant les planches et le jeu de
captures, et corrigés immédiatement plutôt que documentés.

| Défaut | Effet | Commit |
| --- | --- | --- |
| `InspectionDetailPage` lisait un input routé dans son constructeur | NG0950 et colonne principale blanche à **chaque** navigation vers une fiche d'inspection | `fb10d098` |
| Le rechargement de quota s'exécutait dans le contexte suivi d'un effet | Boucle infinie figeant la page sur un 409, sur les quatre pages à quota | `15a59b31` |
| `FacilityService.list()` reconstruisait son sac de paramètres | Rechercher ou filtrer la liste des sites n'envoyait **aucun** filtre au serveur | `e9040674` |
| Sections de collaboration non mockées dans le harnais | Captures de référence polluées par un état d'erreur et un toast technique | `4c8da07d` |
