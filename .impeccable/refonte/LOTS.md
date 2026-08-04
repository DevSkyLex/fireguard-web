# Ordonnancement des lots d'implémentation — UI-v2

> Découpage proposé pour la Phase 4, dérivé du registre `ARBITRAGES.md` et de la
> ronde de cohérence. **À valider avant la première ligne de code.**
>
> Mécanique par lot (éprouvée au chantier précédent) : craft-floor chargé avant
> édition · agents spécialisés · i18n fr+es dans le même lot · hooks e2e migrés
> avec leurs objets de page · gate `format → lint → tests ciblés → build` ·
> captures avant/après · une ronde d'inspection, un batch de corrections, au plus
> une confirmation · commit au type conventionnel du contenu avec le marqueur
> `UI-v2 lot N`.

## Principes d'ordonnancement

1. **Les fondations d'abord** : ce qui change le shell et les primitives partagées
   bloque tout le reste ; le faire en premier évite de retoucher chaque famille.
2. **Un petit lot de validation ensuite** : F9 est le périmètre le plus sûr du
   produit ; il éprouve les fondations sans risquer un écran critique.
3. **Les familles ensuite, par risque croissant**, en groupant celles qui
   partagent une primitive.
4. **Le workspace en dernier** : le plus gros template de l'application, et le
   bénéficiaire de toutes les primitives construites avant lui.
5. **Une route déplacée garde sa redirection** dans le même lot (applications
   installées, favoris), et son `FEATURE.md` est mis à jour dans le même change.

## Les onze lots

| # | Lot | Contenu | Dépend de | Risque |
| --- | --- | --- | --- | --- |
| **1** | **Fondations du shell** | Shell à trois colonnes : rail supprimé, en-tête d'organisation commutable en popover, menu utilisateur dans l'en-tête · trois groupes de navigation visibles · repli de barre latérale câblé · barre de commande basse mobile généralisée (infrastructure) · réparations de parcours (sous-chemin d'organisation préservé, assistant tolérant à une panne, refus de permission nommé) · toast fermable au clavier et hors de la barre mobile | — | **Élevé** — touche les trois mises en page et tous les objets de page e2e |
| **2** | **Normes** | Amendement ARCHITECTURE.md §10.5 (l'édition en place est une surface de page) · DESIGN.md : shell à trois colonnes, cinq gabarits de page, convention d'action primaire unique | 1 | Faible — documentaire |
| **3** | **F9 — pages focalisées** | 404 avec sorties contextuelles · 403 nommant la permission manquante · 500 distinguant réseau et panne · maintenance relue · invitation en accueil deux volets · en-tête focalisé portant la marque | 1 | **Faible** — éprouve les fondations sur un périmètre sûr |
| **4** | **F1 — Aujourd'hui + Statistiques** | Quatre files de travail · page Statistiques accueillant inventaire et tendances · nouvelle entrée de navigation · libellé « Aujourd'hui » | 1, 2 | Moyen — nouvelle route, nouvelle entrée de nav |
| **5** | **F4 — vues de travail** | Vues nommées et mémorisées (cookie, 5 max) · surface de filtres · tri exposé · comportement unifié des trois rendus · calendrier replanifiant par dépôt | 2, 4 | Moyen-élevé — l'écran le plus utilisé du poste bureau |
| **6** | **F2 — Patrimoine** | Explorateur : arborescence des sites (`p-treeTable`), contenu du nœud en onglets, mode « tout à plat » · deux entrées de navigation fusionnées · dialogue de quota monté sur les listes | 1, 2 | **Élevé** — fusion d'entrées, composant d'arbre nouveau |
| **7** | **F3 — fiches éditables** | Édition en place des trois fiches · trois routes `/edit` retirées avec redirection · bande d'état nommant sa prochaine action (équipement, inspection) · « introuvable » remplaçant la page entière | 2, 6 | Moyen — suppression de routes |
| **8** | **F6 — Équipe et réglages** | Membres + Rôles fusionnés en « Équipe » (3 onglets) · permissions lues par personne · réglages en sections ancrées · compte aligné sur le même gabarit · centre de notifications unifié | 1, 2 | Moyen-élevé — fusion d'entrées, deux pages refondues |
| **9** | **F8 — activation** | Assistant en liste d'activation · reprise explicite · étapes facultatives annoncées · vitrine montrant le produit au travail · progression dédoublée supprimée | 1 | Moyen |
| **10** | **F7 — collaboration en panneau** | Fil ouvert dans le panneau contextuel · sélecteur Fil · Infos · Assistant · favoris en file de lecture · bande d'identité unifiée · erreur des messages directs en ligne | 2 | Moyen-élevé — dépend de la levée de limite du lot 2 |
| **11** | **F5 — workspace guidé** | Commande en sujet de page · une surface de travail par phase · rail dissous en surface « Détails » · cérémonie de publication et état « inscrit au registre » · sections hors phase démontées | 2, 10 | **Le plus élevé** — 1 372 lignes de template, six phases, six tiroirs |

## Re-cadrage du lot 2, décidé au contact du code

La ronde de cohérence avait placé trois primitives partagées dans le lot 2. À
l'ouverture des fichiers, les trois se sont révélées prématurées — chacune pour
une raison différente, et chacune vérifiée plutôt que supposée.

| Primitive | Ce que le code a montré | Où elle va |
| --- | --- | --- |
| **Champ éditable en place** | PrimeNG **ship `p-inplace`**, qui porte déjà la bascule affichage/édition et sa fermeture. Le complément à écrire (sauvegarde, annulation, état d'attente, message de validation) est réel, mais il n'existe **qu'un seul** consommateur aujourd'hui — la description d'intervention. La règle de trois (ARCHITECTURE.md §2.9) interdit d'extraire avant le troisième usage. | **Lot 7 (F3)**, où trois fiches l'adoptent d'un coup et où la forme se valide sur des usages réels |
| **Requête nommée sur les interventions** | Ses deux consommateurs (les files d'« Aujourd'hui », les vues de F4) **n'existent pas encore**. Deux consommateurs futurs ne sont pas deux usages : concevoir la forme à l'aveugle, c'est exactement l'abstraction spéculative que §2.9 proscrit. | **Lot 4 (F1)**, où le premier consommateur naît ; le lot 5 la reprendra |
| **Levée de la limite du panneau** | Le panneau contextuel vit dans le shell, qui est **ancêtre** de la route : déplacer le magasin vers l'injecteur de route ne le rend pas atteignable. Le vrai correctif est de faire rendre la contribution avec l'injecteur du composant routé — un mécanisme de slot qu'aucun consommateur ne peut valider tant que F7 n'existe pas. | **Lot 10 (F7)**, conçu contre son cas d'usage |

Le lot 2 livre donc ce qu'il peut livrer honnêtement : les deux documents
normatifs, qui déverrouillent la revue de tous les lots suivants. Le travail
n'est pas perdu, il est déplacé là où il peut être conçu contre un besoin réel.

## Clôture du chantier (après le lot 11)

1. `fg-a11y-auditor` et `fg-architecture-reviewer` en lecture seule, corrections
   en un batch.
2. Recapture complète du jeu de références et planche-contact avant/après.
3. **Re-score `/impeccable critique`** — référence 24/40, cible ≥ 32.
4. `/impeccable doctor` et passage final sur DESIGN.md.
5. `npm run quality` complet et suite Playwright complète.

## Ce qui reste hors périmètre, et le restera

- Le déverrouillage de l'application avant la fin de l'activation (règle serveur).
- Lier un fil de discussion à un objet métier (évolution d'API).
- Une vraie pagination au-delà du plafond de 500 interventions (contrat backend).
- Toute donnée fabriquée : clients, métriques d'usage, témoignages, conformité à
  une norme nationale (contrainte RNCP et PRODUCT.md).

## Journal du lot 4 — écarts au plan, décidés au contact du code

Le lot est livré en deux temps, séparés par un commit : la page **Statistiques**
d'abord (les appels existants simplement déménagés), puis **Aujourd'hui**.

**Ce qui a été livré au-delà de la lettre de l'arbitrage B1.** La quatrième file,
« non synchronisées », ne pouvait pas venir du même magasin que les trois autres :
elle se lit dans IndexedDB, pas dans la collection. Le magasin porte donc **deux
`CallState` indépendants** plutôt qu'un `withQueryState` — une panne réseau ne doit
pas effacer le travail local, qui est justement ce qu'on regarde quand le réseau
manque. Une cinquième requête, « à venir », alimente le seul état « rien ne
bloque » : elle donne le compte des interventions planifiées et la prochaine
échéance, que la planche demandait sans dire d'où elles venaient.

**Ce qui a été conservé contre la maquette.** Le flux d'alertes du backend
(non-conformités critiques, invitations expirées, matériel en maintenance) n'apparaît
pas dans la maquette de la piste B, qui ne montre que des interventions. Il est
pourtant du travail en attente, et l'API n'en donne que des compteurs — donc pas de
file possible. Il est rendu en bandeau « Aussi en attente » sous les files, une forme
distincte pour une donnée de nature distincte. Le supprimer aurait perdu de
l'information au nom d'une maquette.

**Ce qui est reporté au lot 5, faute de destination.** La planche promet que chaque
file soit « une porte vers la vue correspondante de F4 ». La liste des interventions
n'a **aucun filtre par statut** aujourd'hui — c'est précisément ce que les vues de
travail du lot 5 introduisent. Les quatre boutons « Tout voir » ouvrent donc la liste
non filtrée, plutôt que de porter un paramètre d'URL que rien ne lit. Le lot 5 les
branchera sur leur vue.

**Ce qui a été ajouté chez le voisin.** L'action primaire « Nouvelle intervention »
devait ouvrir la création, pas désigner l'endroit où elle se trouve. La liste des
interventions accepte donc `?create=1`, consommé une fois puis effacé de l'URL. C'est
un ajout de six lignes dans une page de F4, enregistré dans les deux `FEATURE.md`.

**Réorganisation d'ownership au passage.** L'ancien composant `organization-dashboard`
injectait trois magasins, résolvait les permissions et pilotait la navigation — du
travail de page vivant dans un composant (§10.1). La page reprend l'orchestration ; ses
enfants ne font plus que rendre.

**Défauts trouvés et corrigés.** Le renommage de l'entrée de navigation
`dashboard` → `today` a cassé deux choses que les tests ont attrapées : le garde
d'atterrissage cherchait l'entrée par son ancien identifiant et redirigeait donc tout
le monde, et la barre latérale marquait le lien d'accueil actif sur **toutes** les
routes imbriquées (`[exact]` comparé au même ancien identifiant). Le mode de
correspondance de l'entrée est passé à `any` : lire les interventions **ou** le tableau
de bord suffit à mériter l'accueil.

## Journal du lot 5 — écarts au plan, décidés au contact du code

Livré en deux commits : la **surface de travail** (en-tête canonique, filtres,
tri, comportement unifié, persistance), puis les **vues de travail**.

**Le rendu reste un contrôle, et devient aussi une propriété de vue.** L'arbitrage
B4 dit « le rendu devient une propriété de la vue, plus un contrôle concurrent »,
la reco ★ dit « sélecteur de rendu conservé en `p-selectbutton` ». Les deux tiennent :
sélectionner une vue impose son rendu via `?view=`, et le sélecteur reste là pour
changer d'avis — ce qui marque alors la vue comme modifiée. Le paramètre d'URL
garde son nom `?view=` malgré l'ambiguïté du mot, pour ne pas casser les favoris
et l'application installée.

**Le groupement ne s'applique qu'à la liste.** La maquette montre des sections
« En retard / Cette semaine », donc un groupement par échéance. L'étendre au Board
signifierait des colonnes par site ou par responsable — or déposer une carte entre
deux colonnes du Board **est** une transition de statut, gardée par la politique de
workflow et le RBAC. Un Board groupé par site n'aurait aucune sémantique de dépôt.
Chaque rendu groupe donc par ce qu'il est : la liste par la vue, le Board par
statut, le calendrier par date.

**Cinq vues, nommées automatiquement.** Le plafond de l'arbitrage B5 porte sur les
vues personnalisées. Il n'y a pas de dialogue de nommage : la vue prend le nom de
ce qu'elle restreint (le statut, le type, la fenêtre d'échéance, le site, le
responsable, la recherche, à défaut le tri). Une vue est bon marché à supprimer et
à réenregistrer ; un dialogue de plus sur ce chemin ne valait pas son coût.

**Ce qui reste du lot** : la replanification par dépôt dans le calendrier. Le
composant `shared/calendar` n'expose aucune primitive de glisser-déposer — ni sur
le mois, ni sur la semaine, ni sur l'agenda — et WCAG impose une alternative
clavier à tout geste de dépôt. C'est un morceau à part entière, pas une finition.

**Défaut trouvé et corrigé, plus large que le lot.** Le focus clavier n'était
visible sur aucun des contrôles concernés : `outline-none` de Tailwind v4 pose
`--tw-outline-style: none` **sans condition**, et la règle `focus-visible:outline-2`
réutilise cette variable (`outline-style: var(--tw-outline-style)`). Le suppresseur
gagnait donc toujours, y compris au focus. Vérifié dans la feuille compilée puis
corrigé aux trois endroits concernés (barre de vues, ligne de liste, carte de
Board) en retirant `outline-none`, redondant dès lors que la règle est portée par
`:focus-visible`.

**Défaut trouvé et NON corrigé, hors périmètre.** Les boutons PrimeNG ont eux aussi
un anneau de focus invisible, pour une raison différente : `outline-color` résout à
`rgba(0,0,0,0)`. Mesuré au clavier réel dans les deux thèmes. Une tentative de
correction par les jetons du preset a été retirée : après l'avoir appliquée,
`--p-button-secondary-focus-ring-color` valait bien `#818cf8` et l'anneau restait
transparent — la cause est ailleurs, probablement l'ordre des couches CSS
(`@layer theme, base, primeng`). À traiter dans son propre lot ou à la clôture a11y.
