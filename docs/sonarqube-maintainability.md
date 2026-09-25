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

Les scénarios Chromium utilisent l'API locale mockée du projet. Les autres
alertes `Web:S6819`, y compris les groupes du sélecteur d'étage, les rôles
`status` et les autres zones SVG, restent à examiner individuellement.
