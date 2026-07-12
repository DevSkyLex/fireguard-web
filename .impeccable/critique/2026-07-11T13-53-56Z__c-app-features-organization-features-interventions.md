---
target: Le workflow intervention
total_score: 25
p0_count: 2
p1_count: 2
timestamp: 2026-07-11T13-53-56Z
slug: c-app-features-organization-features-interventions
---

# Critique — Le workflow intervention (liste, détail, guide de planification)

## Design Health Score

| #         | Heuristique                         | Score     | Problème clé                                                                                                                                                                                                         |
| --------- | ----------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibilité de l'état du système     | 3         | Stepper/readiness/sync excellents, mais le CTA principal « Submit for review » est `disabled` sans aucune raison au point d'action (ni title, ni aria, ni texte adjacent)                                            |
| 2         | Correspondance système / monde réel | 2         | « 4 interventions loaded » (langage dev), « Add explicit tasks to make the scope assignable » (jargon), pill « Planned » alors que le stepper affiche « Execution » actif — deux modèles mentaux de « où j'en suis » |
| 3         | Contrôle et liberté                 | 2         | Les 6 drawers se ferment sur Esc/backdrop dès qu'aucune requête n'est en vol, perdant silencieusement la saisie ; pas d'undo sur les transitions de statut                                                           |
| 4         | Cohérence et standards              | 3         | Registre de tags exemplaire, mais deux philosophies de CTA coexistent (détail : désactivé silencieux ; drawers : activé + validation au clic) ; la carte board est un pseudo-bouton artisanal                        |
| 5         | Prévention des erreurs              | 3         | Readiness gate, minDate, confirmations destructives — minés par la perte de saisie des drawers                                                                                                                       |
| 6         | Reconnaissance plutôt que rappel    | 3         | Rail de propriétés et `?q`/`?view` persistés OK ; sur mobile la raison d'un CTA désactivé vit ~1200px plus bas (mesuré)                                                                                              |
| 7         | Flexibilité et efficacité           | 1         | Zéro raccourci clavier, zéro action bulk, pas de multi-sélection, pas de changement de statut depuis la liste ; le drag du board est souris uniquement                                                               |
| 8         | Esthétique et minimalisme           | 3         | Rythme de surfaces conforme à DESIGN.md, mais toolbar riche de 10 boutons sur un commentaire terrain, pills redondants sur le board, eyebrows uppercase (« LINKED », « READINESS ») — l'anti-référence de PRODUCT.md |
| 9         | Récupération d'erreur               | 3         | Bannière de note du relecteur + resubmit réactivé ferment bien la boucle changes-requested ; mais le CTA désactivé sans explication est un échec de récupération au moment le plus critique                          |
| 10        | Aide et documentation               | 2         | Bons moments inline (hints du guide, explainer discovery, empty states) mais rien de systématique ; jargon inexpliqué                                                                                                |
| **Total** |                                     | **25/40** | **Acceptable — des améliorations significatives nécessaires**                                                                                                                                                        |

## Verdict anti-patterns

**Évaluation LLM** : ce n'est PAS du slop. Registre Linear discipliné : vocabulaire de statuts piloté par registre (icône + libellé + couleur partout), stepper aux sémantiques méritées, rythme divider-list au lieu de card soup, dark mode réellement premier-classe. Un utilisateur fluent en Linear/Stripe ferait confiance à l'ossature mais tiquerait sur 4 détails « assemblés sans passe éditoriale finale » : le pipe `| titlecase` qui réécrit les titres saisis (« Inspection trimestrielle site Paris » → « Inspection Trimestrielle Site Paris », faux en français), le pill de statut répété sur chaque carte du board _dans sa propre colonne de statut_, un menu overflow contenant exactement un item, et une toolbar rich-text de 10 boutons (code block, blockquote) sur la zone de commentaire d'un agent de terrain.

**Scan déterministe** : CLI `detect.mjs` sur `src/app/features/organization/features/interventions` : **0 finding** — le code de la feature est propre. Détecteur en page (détail FG-4) : 6 findings, dont 2 pertinents pour la feature : (a) le paragraphe de description tourne à **~104 caractères/ligne** (`max-w-3xl` trop large pour du text-sm ; viser 65–75ch) — le détecteur l'a vu, la revue LLM non ; (b) la barre de progression des work items anime `width` (préférer `transform: scaleX`). Faux positif : le `truncate` du breadcrumb signalé comme overflow (ellipse délibérée). Hors périmètre (shell partagé) : transitions `width` de la sidebar, `padding` du body, padding du `#dashboard-layout`.

**Overlays visuels** : injection réussie (console : « [impeccable] 6 anti-patterns found », 11 éléments d'overlay lus) ; l'onglet d'inspection a été refermé au nettoyage.

## Impression générale

Le workflow a une vraie colonne vertébrale : la discipline visuelle est là, le dark mode et l'offline sont réels, et le guide de planification est le meilleur moment du produit. Ce qui manque est l'inverse du slop habituel : pas la personnalité, mais **la tenue de promesse aux moments à enjeux** — le principe produit n°2 (« la prochaine action est toujours évidente ») casse précisément à la sortie de chaque phase, là où un bouton désactivé muet remplace la guidance. La plus grande opportunité : transformer la barre de commande en action recommandée vivante plutôt qu'en point d'arrivée statique.

## Ce qui fonctionne

1. **La discipline du vocabulaire de statuts** — le pipeline `app-tag` garantit icône + libellé + couleur sur chaque surface, jusqu'aux alt d'images des lignes de liste. L'audit n'a trouvé aucun statut couleur-seule dans toute la feature. Rare.
2. **Le dark mode est premier-classe** (vérifié en live) : bannière relecteur, stepper, pills, CTA — tout se re-teinte correctement.
3. **L'offline est conçu, pas rapporté** : bannière sync bloquée avec retry/discard, « Changes are saved offline… » + Sync now, notices par surface, not-found offline-aware.

## Problèmes prioritaires

**[P0] « Submit for review » désactivé sans raison au point d'action**

- Pourquoi : viole le principe produit n°2 au gate le plus critique ; les boutons désactivés sont ignorés par clavier/lecteur d'écran ; sur mobile l'explication (Readiness) est ~1200px plus bas.
- Fix : garder le bouton actif et router vers un résumé des conditions manquantes au clic, OU afficher une ligne inline à côté du CTA (« 1 condition manquante — vous devez être l'agent responsable ») + `aria-describedby`.
- Commande : $impeccable clarify + $impeccable harden

**[P0] Les 6 drawers perdent la saisie sur Esc/backdrop**

- Pourquoi : `[dismissible]`/`[closeOnEscape]` sans dirty-check ; perte de données terrain sur un mis-tap de routine — contredit « zero data loss ». C'est exactement le pattern d'interruption de l'agent mobile.
- Fix : conditionner la fermeture à l'état dirty du formulaire via le pattern ConfirmationService existant.
- Commande : $impeccable harden

**[P1] La cible tactile principale du terrain fait 20×20px**

- Pourquoi : cocher un work item est L'interaction de l'agent ; 20px sous un pouce ganté est très en dessous des 44px.
- Fix : zone de hit ≥44px (padding wrapper), visuel inchangé.
- Commande : $impeccable adapt

**[P1] Trous lecteur d'écran systémiques en deux points**

- Pourquoi : (a) les items du `p-selectbutton` Liste/Board/Calendrier perdent leur nom accessible en largeur étroite (icône seule) ; (b) les 6 formulaires marquent le requis par des astérisques `aria-hidden` et ne lient jamais les erreurs `p-message` via `aria-describedby`. WCAG 4.1.2 / 3.3.x sur les deux contrôles les plus fréquentés.
- Fix : spans sr-only dans le template du toggle ; `aria-describedby` + `[invalid]` systématiques.
- Commande : $impeccable audit (puis fix)

**[P2] Le header title-case le contenu utilisateur**

- Pourquoi : `{{ title | titlecase }}` réécrit « test » → « Test » et mutile les titres français ; un outil de précision qui réécrit silencieusement la donnée opérateur érode la confiance.
- Fix : supprimer le pipe pour les titres issus d'entités.
- Commande : $impeccable clarify

## Red flags par persona

**Alex (power user pressé)** : rien pour lui. Aucun raccourci clavier dans la feature, pas de bulk/multi-sélection, pas de changement de statut sans ouvrir le détail, menu « More actions » à un seul item (« Abandon intervention »), drag du board souris-seul. Il retourne sur Linear en une semaine.

**Sam (accessibilité)** : le plancher est solide (vrais `<button>`, `aria-pressed`, imgs de statut labellisées, une carte pseudo-bouton correctement câblée Enter/Space + focus ring). Les échecs : toggles de vue non nommés, erreurs de formulaires non liées sur les 6 formulaires, drag du board sans chemin clavier, un `role="alertdialog"` vide toujours présent dans le DOM, CTAs désactivés qui disparaissent de l'ordre de tabulation sans explication. Note : PRODUCT.md affirme « phase tablist already implements roving tabindex » — c'est faux, le stepper est un `<ol>` présentationnel (acceptable car non interactif, mais le doc ment).

**Casey (agent terrain distrait)** : la barre pouce existe et est bien épinglée (42px, mesuré). Mais : toggle 20px ; Change status et Readiness enterrés ~1200px sous le feed d'activité ; Send (composer) et Submit (barre) sont deux actions orange pleine-affordance adjacentes qui invitent au mis-tap ; et la perte de saisie des drawers est précisément son pattern d'interruption.

## Observations mineures

- « 4 interventions loaded » — télémétrie développeur comme copie UI ; « 4 interventions » suffit.
- Les cartes du board répètent le pill de statut dans leur propre colonne de statut.
- Les libellés Readiness affirment l'inverse de la réalité quand non remplis (« You are the responsible agent » avec icône warning quand on ne l'est PAS).
- Les lignes de work items complétées sont inertes — impossible d'ouvrir un work item pour inspecter notes/photos depuis la checklist, exactement ce dont la boucle changes-requested a besoin.
- Les lignes « Linked » (Facilities 1 / Equipment 0…) affichent des comptes mais ne naviguent pas.
- L'empty state des work items explique mais n'offre pas de bouton (le `+` est une petite icône dans le header de section).
- Eyebrows uppercase trackées (« LINKED », « READINESS ») dans le rail — l'anti-référence de PRODUCT.md.
- Description à ~104 ch/ligne (détecteur) — passer `max-w-3xl` à `max-w-prose`.
- Barre de progression animée sur `width` (détecteur) — préférer `transform: scaleX` ou accepter (élément de 96px, impact réel négligeable).
- Toggle de thème 3 états cyclique (light→dark→system) peu découvrable.
- Swatches de labels du board : points colorés nus, sans texte apparié.
- La bannière note-relecteur mériterait `role="status"` pour être annoncée à l'arrivée.

## Questions à considérer

1. Si « la prochaine action est toujours évidente » est le principe n°2, pourquoi le CTA de sortie de phase existe-t-il _avant_ d'être actionnable ? La barre pouce pourrait ÊTRE l'action recommandée vivante — « Add work items » → « Complete 2 remaining items » → « Submit for review » — au lieu d'un point d'arrivée statique désactivé.
2. La relecture se fait contre quelles preuves ? Le relecteur demande des modifications, mais les lignes de checklist complétées ne s'ouvrent pas pour voir ce que l'agent a réellement enregistré. Où atterrit l'œil du relecteur ?
3. Qui a demandé des blockquotes et des code blocks dans un commentaire de sécurité incendie ? Un textarea nu + attache photo servirait-il mieux Casey que l'éditeur rich-text hérité ?
