# Triage des issues Maintenability SonarQube — web `develop`

Le scan du commit `a8dd6e05508e8d18654e42d0e636128ef5a245b0` (23 septembre 2026) comptait 616 issues Maintenability ouvertes. Les six alias d'URL Angular
déjà classés **False Positive** ne font pas partie de ce total. Chaque fusion
requiert un nouveau relevé sur le commit exact de `develop`.

Chaque PR de correction cite les clés des issues et les tests du comportement.
Les décisions ci-dessous concernent les alertes qui restent dans le code :

- **False Positive** : le conseil de la règle ne s'applique pas à la sémantique
  réelle de l'élément ou du code, avec une preuve reproductible.
- **Accepted** : l'alerte est juste, mais la correction proposée dégraderait un
  comportement vérifié. Le risque concret est décrit pour chaque issue.

Une note A, le nombre d'alertes et le coût de correction ne motivent aucune
résolution. Les décisions s'appliquent uniquement aux clés examinées dans
`fireguard-web-develop` ; elles ne désactivent pas la règle et n'en modifient pas
la sévérité.

## Décisions justifiées

| Clé Sonar                              | Règle et emplacement                                                            | Décision           | Preuve et justification                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7b8d949a-07bb-4a29-bb1c-b73096c939f4` | `Web:S6819`, `facility-plan-overlay.component.html:8`, `<svg role="group">`     | **False Positive** | L'élément racine SVG regroupe les zones interactives du plan ; aucun élément natif de groupe HTML ne peut le remplacer à cet emplacement sans changer la structure graphique. Chromium expose `group` nommé « Facility zones », vérifié dans `e2e/organization/facilities.spec.ts` avec `getByRole('group', { name: 'Facility zones' })`. Le scénario clavier atteint ensuite la zone et l'active. |
| `696b6749-b8e2-4727-badb-3c13edb81d1c` | `Web:S6819`, `facility-plan-overlay.component.html:27`, `<a role="button">` SVG | **False Positive** | Cette zone SVG sélectionne un calque et porte `aria-pressed` ; elle n'est pas un lien de navigation. Un `<button>` HTML n'est pas valide comme enfant direct de SVG. Chromium l'expose comme bouton nommé, et le scénario `reaches a zone and a pin by keyboard` vérifie la sélection par Entrée, puis l'accès au repère.                                                                          |
| `ea5b7dbc-c746-46ff-82df-5f032e0660e9` | `typescript:S7761`, `theme.service.ts:312`, nettoyage de transition             | **Accepted**       | `cancelThemeTransition()` s'exécute aussi pendant `setTheme()` et la destruction du service sur le serveur. Le `documentElement` Domino d'Angular SSR ne fournit pas `dataset` ; `removeAttribute('data-theme-transition')` évite une exception pendant le rendu. Le test du thème vérifie le nettoyage après interruption de transition et le rendu SSR.                                          |
| `7f107024-1e11-438f-89a2-826c207aceab` | `typescript:S7761`, `theme.service.ts:407`, application du thème                | **Accepted**       | `applyThemeToDocument()` s'exécute lors du rendu SSR avant l'hydratation. Le `documentElement` Domino ne fournit pas `dataset` ; `setAttribute('data-theme', resolvedTheme)` est nécessaire pour émettre le thème dans le HTML sans exception et éviter un flash au chargement. Le test `should apply the requested theme during SSR without a browser animation` vérifie l'attribut.              |

Les scénarios Chromium utilisent l'API locale mockée du projet. Le relevé
suivant poursuit l'examen individuel des groupes et rôles `status` encore
actifs.

## Relevé `Web:S6819` du 25 septembre 2026

Le relevé de `fireguard-web-develop` compte 114 issues `Web:S6819` ouvertes.
Ce lot examine les rôles `status` et `group`, puis les 14 autres rôles dans le
complément ci-dessous. Les lignes indiquées sont celles du scan Sonar et peuvent
avoir légèrement bougé dans le code local.
Sur les **100 issues actives** de ces deux rôles, 24 sont corrigées dans le code.
Les 75 autres faux positifs ont été classés individuellement **False Positive**
dans Sonar avec commentaire propre à chaque clé et statut vérifié. La clé
`986b486f-099b-4172-b09d-d94f485db75c` a été classée **Accepted** après
vérification individuelle du risque décrit ci-dessous. Les 24 corrections de
code attendent le scan du commit exact de `develop`.

La distinction sémantique est celle du [standard HTML pour `output`](https://html.spec.whatwg.org/multipage/form-elements.html#the-output-element) :
un résultat d'action ou de calcul, avec seulement du contenu phrastique. Un
message d'attente, un état hors ligne ou un conseil contextuel relève plutôt du
[rôle ARIA `status`](https://www.w3.org/TR/wai-aria/#status) lorsque son arrivée
doit être annoncée sans déplacer le focus. Cette distinction est également
discutée pour `Web:S6819` par [SonarSource](https://community.sonarsource.com/t/typescript-rspec-6819-should-not-always-require-htmls-output-element-instead-of-aria-status-role/133611).
Dans Chromium via Playwright, un `<output>` est exposé comme `status`, un
`<fieldset aria-label>` et un `<fieldset><legend>` comme groupes nommés ; les
boutons des deux groupes restent atteignables dans l'ordre au clavier. Un
`<div role="status">` contenant un message et un bouton « Retry » est aussi
exposé comme `status`, et son bouton reste tabulable. Ces vérifications
confirment les primitives ; chaque décision ci-dessous dépend aussi du
contenu et de l'état réellement rendus par le template concerné.

### Corrections de ce lot

Chaque ligne indique la clé ouverte avant correction, la ligne du scan et la
raison du remplacement. Les tests ciblés vérifient les composants concernés.

| Clé Sonar                              | Emplacement `Web:S6819`                                 | Correction                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5e57ca97-cfe5-4fbc-a89b-c01ea28d04d7` | `account-notification-list.component.html:25`           | Le filtre de catégories est un ensemble de boutons : `<fieldset aria-label>` conserve le groupe nommé et la navigation Tab.                                                 |
| `f8c5dcc2-7ff6-4016-af63-d697aa6579a7` | `facility-building-3d-room-panel.component.html:51`     | Le choix d'étage est un ensemble de boutons : `<fieldset aria-label>` donne le même groupe natif.                                                                           |
| `e923416c-d62f-444e-a21b-ab2c885a7d01` | `intervention-detail-page.component.html:1010`          | Les actions de transition dans le tiroir mobile sont regroupées par `<fieldset><legend>` ; les boutons Spartan restent des boutons.                                         |
| `9ed930c0-c948-4916-a724-d3ca4df832c7` | `webhooks-page.component.html:207`                      | Les filtres de livraisons sont des boutons regroupés par `<fieldset aria-label>`.                                                                                           |
| `0424b078-607c-45c1-abc9-05a82c076592` | `organization-member-table.component.html:1`            | Les commandes de tri mobile sont regroupées par `<fieldset aria-label>`.                                                                                                    |
| `428f373e-6963-43b3-afe6-b329dea5c163` | `collection-filter-bar.component.html:1`                | La barre de filtres est un groupe de contrôles ; `<fieldset>` conserve son nom accessible et son point de focus programmatique.                                             |
| `fe03ec6e-8e54-493c-987f-8353d0b1323c` | `import-job-table.component.html:89`                    | Le pourcentage de progression est le résultat de l'import : `<output>` donne le rôle natif `status`.                                                                        |
| `9ea90373-d10e-4ecf-af5f-6986e243defb` | `webhooks-page.component.html:33`                       | La notification résulte d'une action sur un webhook : `<output class="block">` garde la présentation et le rôle natif.                                                      |
| `f1622214-04d0-41a9-95bb-df5ffe6eb954` | `organization-global-search-dialog.component.html:59`   | Le nombre de résultats est calculé depuis la recherche : `<output>` garde l'annonce masquée.                                                                                |
| `17017195-3f91-4b45-9847-ae7870db80cc` | `intervention-recurrence-form.component.html:221`       | Le résumé de cadence est calculé depuis les champs du formulaire : `<output>` convient.                                                                                     |
| `bcce1f74-245f-41c4-b251-6ac552626222` | `intervention-operations-sheet.component.html:35`       | L'absence d'opérations est le résultat de la lecture de la file locale déclenchée par l'ouverture du tiroir : `<output class="block">`.                                     |
| `4136a22d-e0c3-4a40-ab81-aeec56e44318` | `channels-panel.component.html:248`                     | « No channels match your search » est le résultat du filtre : `<output class="block">`.                                                                                     |
| `e5ac22b3-ad92-42ee-b0d6-ec5f04eb2ee0` | `channels-panel.component.html:309`                     | Le message de déplacement résulte du glisser-déposer : `<output class="block">`.                                                                                            |
| `3be218c4-1b95-4db0-8050-4cfedb036e2b` | `direct-messages-panel.component.html:105`              | « No matching conversations » est le résultat du filtre : `<output class="block">`.                                                                                         |
| `d33319b8-7583-41ba-877b-4cf6a9225c54` | `organization-assets-page.component.html:779`           | Le nombre d'équipements non évalués est le résultat du calcul de conformité : `<output class="block">`.                                                                     |
| `e0982944-d35e-483c-89b1-4735772f54b0` | `intervention-work-item-table.component.html:331`       | Le résultat d'une sauvegarde locale est rendu par `<output>` dans la ligne desktop ; le tooltip et le libellé restent en place.                                             |
| `0ea6d335-2d0a-42e6-859d-4331a7823e97` | `intervention-work-item-table.component.html:510`       | Le même résultat est rendu par `<output>` dans la carte mobile ; un test vérifie les deux présentations.                                                                    |
| `6fbb6437-811e-43e7-b175-0d66e695d713` | `organization-access-panel.component.html:163`          | Le message suit la copie d'un domaine : `<output class="block">` rend ce résultat sans changer le texte.                                                                    |
| `a263cf4a-009e-47d2-83b0-621e5e15dfaf` | `organization-team-member-add-form.component.html:76`   | Le membre sélectionné est le résultat du choix dans le formulaire : `<output hlmFieldDescription>` garde la description de champ.                                           |
| `54bcf5fa-5105-456e-9c93-1c2ed07f59f8` | `organization-assets-page.component.html:830`           | Le `status` imbriqué dans le bouton Export est retiré ; un `<output>` masqué à côté annonce l'action avec son contexte.                                                     |
| `2c78450b-919d-4b98-be21-80699f82c94f` | `organization-assets-page.component.html:850`           | Même correction pour Archive ; le bouton garde son libellé et une annonce distincte reçoit l'état.                                                                          |
| `c8c0c1d9-231a-40e1-ae8f-0b4672661c5e` | `organization-invitation-accept-page.component.html:89` | Le titre de l'alerte « Opening your workspace » devient un `<output hlmAlertTitle>` ; le spinner reste hors de l'annonce.                                                   |
| `1f14e7f5-d838-4cdd-833f-855fc5a5976a` | `workload-day-sheet.component.html:79`                  | La surcharge est calculée : un seul `<output>` contient le titre et le conseil sous deux `<span>` valides ; le conteneur Spartan n'impose plus son `role="alert"` assertif. |
| `2285e797-4d19-4a7a-94c1-06203b49f372` | `organization-settings-page.component.html:244`         | La confirmation du plan résulte du retour serveur : `<output>` contient le titre et la description, en conservant l'icône et la mise en page Spartan.                       |

### Faux positifs `status` examinés individuellement

Les clés de ce tableau sont classées **False Positive**. Le comportement
énoncé correspond à la branche du template ; `<output>` y désignerait un
résultat d'action ou de calcul inexistant, ou recevrait des éléments de bloc et
des contrôles interdits par son modèle de contenu. Le rôle `status` annonce
l'état sans déplacer le focus. Aucun rôle n'est appliqué à un contrôle
interactif lui-même.

| Clé Sonar                              | Emplacement `Web:S6819`                                 | Preuve et justification individuelle                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `4c5eba5e-5bf2-474b-8821-6278ce76c0c3` | `account-inbox-list.component.html:7`                   | L'inbox signale une liste incomplète et contient le bouton Retry ; `<output>` ne peut contenir ce bouton ni ses blocs.                                |
| `d52aa730-a051-4dd0-a2d3-c132ed1bad5a` | `account-inbox-list.component.html:41`                  | La première page de l'inbox attend le réseau et rend des squelettes, pas un résultat.                                                                 |
| `0a8f3a1d-ff59-49aa-bca1-3897c2576bdc` | `account-menu.component.html:4`                         | Le menu annonce le chargement du compte pendant ses squelettes, sans action de calcul.                                                                |
| `c77d3eb2-bf2e-4c1d-9c14-bd59c0c04dfd` | `account-sessions-panel.component.html:26`              | Le panneau annonce le chargement des sessions et contient plusieurs blocs squelettes.                                                                 |
| `047b4ad5-536c-497a-8717-e0a92364b646` | `account-trusted-devices-panel.component.html:26`       | Le panneau annonce l'attente des appareils de confiance avec des blocs squelettes.                                                                    |
| `a4b151a3-1175-4c4a-b36a-dfc8342431a3` | `notification-bell.component.html:151`                  | Le volet signale des mises à jour partielles et offre un bouton de reprise ; le contenu n'est pas phrastique.                                         |
| `48199fda-3060-49da-9335-f59b1c260c7a` | `notification-bell.component.html:197`                  | L'ouverture du volet annonce l'attente des notifications pendant les squelettes.                                                                      |
| `35c810be-fa8b-4f0c-acbd-61b9ba7ecbe5` | `account-organizations-page.component.html:3`           | La page annonce l'attente des organisations avec plusieurs blocs squelettes.                                                                          |
| `771413f5-0fc4-4e61-bd1b-17ef827bbb04` | `account-profile-page.component.html:27`                | La page annonce l'attente du profil avec des blocs de chargement, sans résultat calculé.                                                              |
| `3132f57c-7f96-41f1-9329-56cdf414b22c` | `account-security-page.component.html:27`               | Les réglages de sécurité sont en chargement ; le conteneur comprend des squelettes de blocs.                                                          |
| `bfe9d950-a425-4651-b3bf-bf32e64c46d5` | `account-security-page.component.html:102`              | La demande de changement d'adresse reste en attente de confirmation ; l'avis contient deux paragraphes et des boutons de renvoi/annulation.           |
| `3832be60-ead4-4ccc-b328-f8f7d9485c06` | `register-form.component.html:184`                      | Le texte masqué annonce l'évolution des exigences du mot de passe ; ce conseil de validation n'est ni le résultat du formulaire ni un calcul affiché. |
| `da9a685c-1f14-419b-9142-d08c7ba87215` | `login-page.component.html:17`                          | Le fournisseur d'identité est encore en chargement et le conteneur inclut un spinner ; aucun résultat n'existe encore.                                |
| `b034e802-3446-41cc-a2be-3b911132734b` | `register-page.component.html:16`                       | Même attente du fournisseur pendant l'inscription, avec spinner et annonce polie.                                                                     |
| `97aa7b49-f672-4110-8c1a-be02b7fdfdf2` | `onboarding-members-form.component.html:75`             | Le champ donne un conseil lorsque la capacité d'invitation est atteinte ; ce texte reste une description du champ.                                    |
| `45fdb02d-a2d3-4695-a889-35225a04e2e4` | `onboarding-wizard-page.component.html:69`              | La restauration de configuration alterne squelette et bouton Retry ; un `<output>` serait invalide avec ce contrôle.                                  |
| `698035f1-6a22-4b40-8572-c5efab233029` | `onboarding-wizard-page.component.html:104`             | Les choix du catalogue sont encore en chargement ; plusieurs blocs squelettes accompagnent l'annonce.                                                 |
| `adc5b6e4-3c2e-4f65-9c59-3cc38325ef0d` | `onboarding-wizard-page.component.html:287`             | L'activation est en attente, avec spinner ; le résultat n'est pas encore disponible.                                                                  |
| `5202c9c8-cf39-4280-8e26-1836c271771e` | `onboarding-workspace-page.component.html:31`           | La recherche des espaces de travail est en cours, avec spinner ; il s'agit d'un état transitoire.                                                     |
| `7abdb8c4-1c31-4ad7-b849-b7933e5c6f1d` | `calendar-page.component.html:136`                      | Le calendrier annonce des sources partiellement disponibles, sous forme de liste avec action de reprise ; `<output>` ne peut contenir ce flux.        |
| `b2d592bc-8ffb-42eb-bf65-7acae9a1e68e` | `assistant-panel.component.html:1`                      | L'annonce masquée suit les états de génération de l'assistant ; elle décrit une activité en cours, pas sa réponse finale.                             |
| `a6864f05-6945-4e69-8d10-b2be5274a52b` | `channels-panel.component.html:180`                     | Le chargement de l'arbre des canaux utilise des lignes squelettes en blocs.                                                                           |
| `f21aed23-46ae-47e1-b277-97f8d30d5a9a` | `direct-messages-panel.component.html:85`               | L'échec partiel contient un message en paragraphe et un bouton Retry ; `<output>` ne peut les envelopper.                                             |
| `91400003-11d8-4b74-8b10-a3e9b894e934` | `message-reply-sheet.component.html:14`                 | Le texte masqué suit chargement, envoi et erreurs du fil ; ce sont des états transitoires annoncés sans déplacer le focus.                            |
| `7dfacb4e-4a43-42d3-98a4-920d8786e2d7` | `equipment-kpi-strip.component.html:26`                 | L'annonce masquée accompagne les cartes KPI encore en chargement ; elle ne décrit aucun chiffre calculé.                                              |
| `06ae98b3-63f9-454f-aa89-4d585a553ecb` | `equipment-maintenance-history.component.html:11`       | L'historique attend ses données et rend des squelettes de lignes.                                                                                     |
| `56a4a814-106b-45b9-ac4a-b5b9daa3da7a` | `equipment-detail-page.component.html:184`              | La fiche équipement attend ses données et rend des squelettes de sections.                                                                            |
| `271b82f2-ca7e-424a-bbdf-e7c5bea10512` | `non-conformity-list.component.html:2`                  | La liste des non-conformités annonce son chargement avec des blocs squelettes.                                                                        |
| `d0eda73d-86ee-4771-85ba-4472098b1102` | `inspection-analytics-page.component.html:88`           | L'annonce masquée indique que les KPI d'inspection sont encore en chargement.                                                                         |
| `af3756f1-0c54-46a8-ba59-18e6cee5f12e` | `inspection-analytics-page.component.html:163`          | Le graphe de sévérité attend des données et montre des squelettes de cartes.                                                                          |
| `d98f9e95-f622-477f-8529-8e47480783f2` | `inspection-detail-page.component.html:204`             | La fiche d'inspection attend ses données et rend des squelettes de sections.                                                                          |
| `a0735e47-b21d-460b-bd17-3d8a36ab2344` | `intervention-attachments.component.html:86`            | La liste des pièces jointes annonce son chargement avant tout résultat.                                                                               |
| `55500cf4-d02f-472f-8f40-e563ed466f3f` | `intervention-issues-checklist.component.html:2`        | La vérification des conditions de publication est en cours ; l'annonce décrit l'attente.                                                              |
| `0cbb9d7f-58a1-4aaa-960a-a7c535f98959` | `intervention-kpi-strip.component.html:3`               | Le texte masqué annonce le chargement des chiffres clés pendant les squelettes.                                                                       |
| `f248c4e4-a3b2-4d87-be4e-a8d2a491523b` | `intervention-sync-indicator.component.html:258`        | La file locale est en lecture ; le message « Reading the queue » décrit l'activité, pas un résultat.                                                  |
| `86aa6e37-6c73-4013-aedb-e864041e5b56` | `intervention-table-feedback.component.html:2`          | L'avis explique que les lignes affichées viennent du cache local et ne constituent pas une requête serveur actuelle.                                  |
| `68e90b0c-db8d-400f-8fa7-d25be2969866` | `intervention-table-feedback.component.html:12`         | L'avis indique que seuls les derniers résultats en mémoire restent visibles hors ligne ; c'est une provenance, pas un nouveau résultat.               |
| `91ec8a42-7fdd-4d9e-a43e-55a4c66a9d01` | `intervention-assign-dialog.component.html:87`          | Le catalogue d'affectation attend ses choix ; le message décrit un chargement.                                                                        |
| `52f37500-1dc2-435a-9343-2e32da16ea7b` | `intervention-publish-dialog.component.html:42`         | La publication attend une confirmation ou signale un délai ; le message et son spinner décrivent un état non résolu.                                  |
| `cd423e76-39fa-42c7-9763-8acd2608879d` | `intervention-detail-page.component.html:9`             | La fiche d'intervention attend ses données et rend des squelettes de sections.                                                                        |
| `77b327c0-dd2c-468f-bd0b-10b425feb4de` | `intervention-detail-page.component.html:22`            | La notice hors ligne explique les limites de la copie locale dans un paragraphe de bloc.                                                              |
| `8c12531d-1f11-4588-9839-72fdd26fece3` | `intervention-detail-page.component.html:66`            | L'alerte Spartan décrit une publication encore non confirmée, avec paragraphes et bouton « Check result ».                                            |
| `112ddbcc-80aa-455f-aa72-056fa5a79fe8` | `intervention-detail-page.component.html:867`           | Le libellé suit la file de synchronisation : vérification, attente, action requise ; il ne représente pas un résultat définitif.                      |
| `987495c7-61b7-47d0-a408-1ea6f7656431` | `interventions-page.component.html:8`                   | La notice indique que les lignes viennent du cache et qu'elles peuvent être incomplètes ; son paragraphe est un conseil contextuel.                   |
| `ed2c01aa-2fdf-455f-af60-43c0fcb12e6a` | `interventions-page.component.html:1267`                | La colonne Kanban annonce l'attente de ses lignes, sans résultat à afficher.                                                                          |
| `d616b1e8-77ea-42a8-aaaa-e7177a635f6d` | `intervention-operations-sheet.component.html:33`       | La lecture des opérations enregistrées est en cours ; le message est provisoire.                                                                      |
| `2f9f93c5-d374-475a-a711-09e866eb9c90` | `intervention-time-sheet.component.html:20`             | L'alerte Spartan indique que les temps restent sur l'appareil et seront vérifiés plus tard ; son paragraphe ne décrit aucun résultat serveur.         |
| `e7826155-c618-4814-9912-b59b29899e54` | `workload-page.component.html:136`                      | L'alerte Spartan explique que l'évaluation est indisponible hors ligne, avec titre et description en paragraphes.                                     |
| `cdbeb9e1-2b3f-4eef-86a8-ed0f36f58e44` | `workload-page.component.html:158`                      | La projection de charge est encore en cours de chargement ; le conteneur porte un squelette.                                                          |
| `eec5da80-3b1a-4119-8717-d696a771cd6d` | `workload-page.component.html:163`                      | L'alerte Spartan prévient que certaines tâches ne sont pas quantifiables ; titre et description sont des blocs explicatifs.                           |
| `fd6a9028-ee3a-4401-9c7c-017b030a086c` | `workload-capacity-sheet.component.html:19`             | L'alerte du tiroir demande de se reconnecter pour enregistrer la disponibilité ; c'est un conseil, avec description de bloc.                          |
| `f7217eea-f2ae-44e7-8f5f-2ef6577e7f8e` | `workload-day-sheet.component.html:88`                  | L'alerte indique que cette journée n'a pas de capacité ; elle qualifie l'état de la journée.                                                          |
| `78b0a814-80b1-489d-b7f9-a74695b8310d` | `workload-day-sheet.component.html:93`                  | L'alerte précise que la charge est incomplète et en donne la raison dans des paragraphes.                                                             |
| `e11ecdf8-1221-4c70-a467-a2f15aca59dd` | `organization-access-panel.component.html:20`           | Les paramètres d'accès attendent leur chargement et rendent deux blocs squelettes.                                                                    |
| `bc1453c2-9382-4e75-b3a0-ad65bd344338` | `organization-dashboard-recent.component.html:24`       | L'annonce masquée accompagne une liste récente marquée occupée, pendant son chargement.                                                               |
| `4053f524-3a5d-44c7-a751-3dc13039b986` | `organization-join-request-panel.component.html:29`     | Le panneau des demandes d'adhésion est encore en chargement, avec des squelettes.                                                                     |
| `f333cc32-5c2a-41ef-a041-f197ed9c9edc` | `organization-assets-page.component.html:357`           | Le volet équipement annonce l'attente de ses ressources et rend des cartes ou lignes squelettes.                                                      |
| `93dd9309-f821-4a6c-9b93-cd5f3d6030e1` | `organization-assets-page.component.html:522`           | Le volet inspections annonce l'attente de ses ressources et rend des cartes ou lignes squelettes.                                                     |
| `178ddb25-f9d6-4df2-a7b4-34ecf581ae29` | `organization-assets-page.component.html:740`           | Le résumé de conformité n'est pas encore calculé ; seuls des squelettes sont présents.                                                                |
| `60ff63ae-ec48-484d-a644-841ccd61aaef` | `organization-assets-page.component.html:978`           | Les registres archivés sont en chargement et représentés par des squelettes.                                                                          |
| `3001e65a-0b44-499b-9730-381618dc4c32` | `organization-dashboard-page.component.html:146`        | Les graphiques se rafraîchissent tandis que l'ancienne période reste visible ; ce texte décrit une attente.                                           |
| `2374e8fe-17a5-4489-8fa4-f0a5022dab13` | `organization-dashboard-page.component.html:324`        | La répartition par sévérité attend ses données et rend des cartes squelettes.                                                                         |
| `451611e6-439b-4a2a-bb02-b5298f649b72` | `organization-invitation-accept-page.component.html:56` | L'invitation est en cours de chargement, avec des squelettes de blocs.                                                                                |
| `47de29ab-775a-4804-959f-d3d6ad119ae4` | `organization-member-profile-page.component.html:89`    | Le profil membre attend ses données et rend des squelettes de sections.                                                                               |
| `4e4af390-29ca-489e-948c-c6bd6a5c6888` | `organization-select-page.component.html:12`            | La liste des organisations est en cours de chargement, avec un spinner et un message d'attente.                                                       |
| `1ac20107-7515-4d70-afdd-8fda2401b37c` | `organization-settings-page.component.html:3`           | Les réglages attendent leur chargement et rendent des squelettes de sections.                                                                         |
| `700c632b-5221-42b5-99b6-5d7166981179` | `organization-settings-page.component.html:208`         | La confirmation de souscription est encore en attente du serveur ; l'alerte inclut un bouton de rafraîchissement.                                     |
| `ced88ff3-7fab-4ec5-9d05-e925fdf8a335` | `organization-settings-page.component.html:416`         | Les factures sont en cours de chargement, avec des squelettes de lignes.                                                                              |
| `ff11994b-7077-412a-b370-ca9d592009e7` | `board.component.html:151`                              | La colonne commune annonce le chargement de ses cartes ; aucun résultat n'est encore présent.                                                         |
| `8e77dea1-e459-414e-aa27-99f893089768` | `collection-surface.component.html:2`                   | L'annonce masquée signale le premier chargement d'une collection ; la collection est encore vide.                                                     |
| `7b39c996-438f-498a-b2cb-0eafad610c05` | `collection-surface.component.html:4`                   | L'annonce « Refreshing » et le spinner signalent une mise à jour en cours sur des résultats déjà visibles.                                            |
| `b7d65311-ed11-4888-a8e8-8fce5e40ec02` | `plan-viewer.component.html:65`                         | Le fond du plan est en chargement ; le squelette porte un nom accessible, pas un résultat.                                                            |

### Faux positifs `group` vérifiés au navigateur

Les groupes ci-dessous sont des surfaces d'interaction ou des points de retour
du focus, et non des ensembles de contrôles de formulaire. Un `<fieldset>`
leur donnerait une sémantique de formulaire inexacte ; un `<section>` créerait
un repère de page sans représenter leur interaction. Les assertions Chromium
dans `e2e/organization/facilities.spec.ts` visent l'élément rendu dans la
vraie page par son rôle et son nom accessibles, puis y placent le focus.

| Clé Sonar                              | Emplacement `Web:S6819`                      | Preuve et justification individuelle                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `95d5c1c5-5088-4986-b94c-641418d811a5` | `facility-building-3d-page.component.html:1` | Chromium trouve `group` nommé « 3D building view ». Le test place le focus sur cette racine et vérifie qu'Escape sans sélection ne le perd pas ; le test unitaire vérifie qu'Escape désélectionne la pièce et que la fermeture du panneau restaure le focus.                                                                                           |
| `44f7dc6f-3cf7-4186-a3c0-e2336589aa32` | `facility-detail-page.component.html:1`      | Chromium trouve `group` nommé « Facility record » dans la fiche réelle, et cette racine reçoit le focus. Le test de fiche vérifie aussi que ce point reçoit le focus de secours quand le contrôle d'ouverture du détail de plan a disparu.                                                                                                             |
| `486d7258-91ac-4e43-b065-37b2af451569` | `plan-viewer.component.html:47`              | Chromium trouve `group` nommé par le fichier du plan, avec `aria-roledescription="floor plan viewer"`. Le test place le focus sur le viewport : `+` modifie la transformation du plan et `0` la réinitialise ; les tests unitaires couvrent les flèches de panoramique. Un `<fieldset>` qualifierait faussement cette surface graphique de formulaire. |

### Issue classée **Accepted**

| Clé Sonar                              | Emplacement `Web:S6819`                | Preuve et risque d'une correction automatique                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `986b486f-099b-4172-b09d-d94f485db75c` | `interventions-page.component.html:27` | Le bilan est bien un résultat d'action, mais l'alerte Spartan annonce ensemble le nombre réussi/échoué, les éléments exclus, les erreurs par intervention et le bouton de reprise. Son DOM contient des `<p>`, un `<ul>` et un `<button>`, interdits dans le contenu phrastique de `<output>`. Remplacer le groupe par un résultat texte perdrait ces détails et l'action ; supprimer `role="status"` rétablirait le `role="alert"` assertif imposé par `hlmAlert`. Chromium expose un `div role="status"` avec message et bouton comme `status` tout en gardant le bouton tabulable. |

### Complément : 14 autres rôles du même relevé

Les 14 autres clés `Web:S6819` du scan ont été examinées séparément. Six sont
corrigées. Huit restent des **candidates** False Positive : les tests unitaires
et la norme étayent la sémantique, mais le classement Sonar attend la
vérification de l'arbre accessible et du clavier dans le navigateur Codex.
Aucune des huit candidates de ce complément n'est encore résolue dans Sonar.

Le [tableau ARIA in HTML du W3C](https://www.w3.org/TR/html-aria/#docconformance)
autorise `role="img"` sur `<canvas>` et `role="option"` sur `<button>`, mais
**interdit** `role="combobox"` sur `<textarea>` : ce dernier conserve son rôle
natif `textbox`. [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria/#aria-activedescendant)
autorise un `textbox` à contrôler une `listbox` avec
`aria-controls`/`aria-activedescendant`, en gardant le focus dans le champ.

| Clé Sonar                              | Emplacement `Web:S6819`                                   | Correction et preuve                                                                                                                                                                                                                          |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fa5c09ff-6a6a-4445-8788-ab9afafed2d3` | `message-composer.component.html:64`, `combobox`          | Retrait du rôle invalide sur le `<textarea>` multiligne. Ses attributs de suggestions restent sur le `textbox` natif ; les tests vérifient `aria-controls`, `aria-activedescendant`, la sélection par flèches et Entrée sans envoi prématuré. |
| `4ea06ddb-ed1f-4d20-a5a8-0ade2d9269df` | `intervention-comment-form.component.html:62`, `combobox` | Même correction : le champ garde son rôle `textbox` autorisé et le popup `listbox` contrôlé ; les tests vérifient le focus dans le brouillon après flèche puis Tab/Entrée.                                                                    |
| `ab5067e8-1ebe-4d01-9caa-4633c3182209` | `workload-planning-panel.component.html:58`, `region`     | Le contenu repliable nommé devient `<section hlmCollapsibleContent>` ; la directive Spartan et `aria-labelledby` restent sur l'élément natif. Le test vérifie le nom lié au déclencheur et l'ouverture.                                       |
| `e03b0f07-880d-4177-af21-26abfd527ba9` | `workload-day-sheet.component.html:222`, `region`         | Le panneau « Work not included » devient `<section hlmCollapsibleContent>` ; le test vérifie `aria-labelledby`, ouverture et contenu de la liste.                                                                                             |
| `2d4f7531-62d1-4832-8493-a5680cc78969` | `board.component.html:47`, `region`                       | Le scroller du tableau devient `<section>` avec le même id, nom accessible, `tabindex="0"`, écouteur de défilement et styles ; le test vérifie cette surface et les commandes de défilement existantes.                                       |
| `16dfe350-c71f-49fd-b49a-de4924eefb35` | `collection-surface.component.html:26`, `region`          | Le conteneur de tableau devient `<section hlmTableContainer>` ; le sélecteur de la directive locale accepte aussi `section`, sans changer les usages `div`. Le test vérifie `data-slot`, `tabindex="0"` et le nom issu du `<caption>`.        |

| Clé Sonar                              | Emplacement `Web:S6819`                                  | Preuve dans le code et tests ; vérification navigateur encore requise                                                                                                                                                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `39873692-4c6d-43c7-8d6f-7ec1b79103d6` | `message-composer.component.html:10`, `listbox`          | Le popup de mentions présente nom, avatar et rôles, puis insère le membre au curseur d'un `<textarea>` ; `<datalist>` ne prend pas en charge ce contenu ni ce champ. Les tests vérifient le filtrage, la sélection par flèches/Entrée et la fermeture par Escape. Vérifier son nom « Members you can mention » dans l'arbre accessible. |
| `1d3e86b2-ba48-4fbe-9fef-5a4e8536fcd2` | `message-composer.component.html:19`, `option`           | La ligne est désormais `<li role="none"><button role="option" tabindex="-1">` : le rôle est autorisé sur `button`, qui garde le clic ; l'option est liée par `aria-activedescendant` au champ. `<option>` natif ne peut représenter avatar/rôles ni cette insertion au curseur. Vérifier le nom et l'état sélectionné.                  |
| `dbaa7ed7-628f-455c-9f4f-2d9de7d0bad6` | `facility-plan-item-list.component.html:1`, `listbox`    | Le registre partagé des zones, pièces et équipements distingue le parcours fléché de la sélection par Entrée/Espace, et projette un décorateur de statut ; un `<select>` fusionnerait ces états et ne pourrait rendre les statuts. Les tests vérifient le nom, le focus mobile et l'activation sans sélection anticipée.                |
| `d241e2c1-39e4-4270-b8fd-b6288e5ced4d` | `facility-plan-item-list.component.html:9`, `option`     | Chaque `<button role="option">` reçoit le focus réel via un `tabindex` mobile, porte `aria-selected` uniquement pour le choix confirmé et garde Entrée/Espace natifs. `role="option"` sur `button` est autorisé ; `<option>` ne peut contenir les statuts projetés. Vérifier le nom et les changements de focus/état.                   |
| `98767979-35c0-47e2-9690-94ce19373950` | `intervention-comment-form.component.html:21`, `listbox` | Le popup affiche les membres pendant la saisie d'un commentaire multiligne ; le test vérifie flèches, Tab/Entrée et retour du focus au `<textarea>`. `<datalist>` n'est pas une alternative pour ce champ et ces lignes riches. Vérifier le nom « Members you can mention ».                                                            |
| `5719374b-f1ce-4a0f-b6cd-4384625dce89` | `intervention-comment-form.component.html:31`, `option`  | Le `<button role="option" tabindex="-1">` est choisi via `aria-activedescendant` sans sortir du champ ; le test vérifie `aria-selected` et l'insertion au curseur. `role="option"` sur `button` est autorisé ; `<option>` ne rendrait pas l'avatar ni l'action actuelle. Vérifier son nom et son état dans l'arbre accessible.          |
| `34b1d722-b3f2-44c4-a5b0-4330b7c830b4` | `facility-building-3d-scene.component.html:3`, `img`     | Le `<canvas>` est la surface WebGL interactive et porte le nom « 3D view of … — N floor(s) » ; le test vérifie `role="img"` et ce nom. Un `<img>` figerait le rendu et supprimerait rotation/sélection. W3C autorise ce rôle sur `<canvas>`. Vérifier l'image nommée dans le navigateur.                                                |
| `8a1791d0-06be-43f4-9dba-de844c5e8ecd` | `intervention-signature-dialog.component.html:22`, `img` | Le `<canvas>` collecte les traits au pointeur puis exporte un PNG par `toBlob()` ; le test vérifie dessin, effacement, confirmation et option de passer la signature. Un `<img>` ne capterait pas les traits. W3C autorise ce rôle sur `<canvas>`. Vérifier « Signature drawing area » dans l'arbre accessible.                         |

## Relevé `Web:S1827` et `Web:S7927` du même scan

Les six alertes `Web:S1827` ont été examinées une par une. Les trois inputs
`HlmMessage`/`HlmBubble` sont des **candidats False Positive** : la directive
Spartan retire l'attribut HTML `align` du DOM hôte et émet `data-align` pour
le placement. `HlmInputGroupAddon` ne retire pas cet attribut sur un `<div>` :
les trois autres alertes sont de vrais défauts. Leurs hôtes deviennent donc
`<hlm-input-group-addon>`, sélecteur déjà fourni par Spartan, en conservant
l'input `align="block-end"` et la même variante de placement. Les trois
candidates attendent la vérification du DOM rendu dans le navigateur Codex.

| Clé Sonar                              | Emplacement `Web:S1827`                       | Décision                 | Preuve propre à l'occurrence                                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eb56af03-9414-4658-a11c-e86191d673a8` | `assistant-panel.component.html:45`           | Candidate False Positive | `[align]` choisit `end` pour un message utilisateur, `start` pour l'assistant. `HlmMessage` consomme cet input, émet `data-align` pour inverser l'ordre du message et retire l'attribut HTML.           |
| `daf9e22e-b77e-43c0-9fe3-5ea9ee57bc71` | `assistant-panel.component.html:48`           | Candidate False Positive | `align="end"` est l'input `HlmBubble.align` de la bulle utilisateur ; sa classe `data-[align=end]:self-end` la place à droite, et la directive retire l'attribut HTML obsolète.                         |
| `f80e1faa-2bf5-4039-a24d-7ba2e1d0043a` | `assistant-panel.component.html:161`          | Corrigée                 | L'input `HlmInputGroupAddon.align` reste `block-end`, mais il est porté par l'élément Spartan `<hlm-input-group-addon>` plutôt que par un `<div>` avec attribut HTML obsolète.                          |
| `800a5f40-02ab-4015-b0a8-4ae41d3ee4e3` | `message-row.component.html:3`                | Candidate False Positive | `[align]` dépend de `entry.isOwn` pour placer l'auteur ou le destinataire. `HlmMessage` génère `data-align` et annule l'attribut HTML ; l'input ne peut être retiré sans inverser les messages envoyés. |
| `44123ca5-930c-4e9e-bcd3-c0ffcd26ae0b` | `message-composer.component.html:85`          | Corrigée                 | Le pied multiligne passe de `<div hlmInputGroupAddon>` à `<hlm-input-group-addon>`, avec `align="block-end"`, `order-last w-full`, compteur et bouton inchangés.                                        |
| `367f1f36-6311-4cf0-8c1b-0434f7d62536` | `intervention-comment-form.component.html:82` | Corrigée                 | Même correction sur le pied du commentaire : l'input Spartan garde le bouton de mention sous le champ sans attribuer `align` à un `<div>` natif.                                                        |

Les quatre alertes `Web:S7927` sont également des **candidates False Positive**.
Le [critère WCAG 2.5.3](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name)
exige que le nom accessible contienne un éventuel libellé textuel visible.
Les tests des composants vérifient les deux branches du bouton d'envoi et les
deux branches du menu de plan. La revue navigateur doit confirmer la visibilité
et le nom calculé en modes bureau/mobile avant tout classement Sonar.

| Clé Sonar                              | Emplacement `Web:S7927`                | Preuve propre à l'occurrence                                                                                                                                                                   |
| -------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0e33ba29-297e-45d1-9e14-9f28de45dde9` | `message-composer.component.html:108`  | À l'état normal, le texte affiché sur mobile est « Send message », exactement le `aria-label` du bouton ; l'icône est `aria-hidden`. Sur bureau, le bouton n'affiche que l'icône.              |
| `9d8d982d-de11-4149-aa03-30bd16df38ef` | `message-composer.component.html:108`  | Pendant l'envoi, le spinner remplace l'icône et reste `aria-hidden` ; le texte mobile « Send message » et le `aria-label` restent identiques.                                                  |
| `35eaaae7-9a2c-4972-91ab-27d4ad9288e5` | `facility-plan-list.component.html:88` | Le bouton de menu au repos est uniquement une icône `aria-hidden`, sans texte visible ; `aria-label="Plan actions"` lui donne un nom accessible. Le nom du plan est dans le bouton voisin.     |
| `887a8b80-8df8-4730-ba35-a13ed6f16776` | `facility-plan-list.component.html:88` | Pendant l'écriture, un spinner `aria-hidden` remplace l'icône ; le bouton reste sans texte visible, nommé « Plan actions » ; les libellés View/Set as primary/Delete sont dans le menu séparé. |
