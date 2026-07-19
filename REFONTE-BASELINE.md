# Refonte « Collaboration » — ligne de base

Mesuré le 2026-07-19 sur `main` @ `45b0ee11`, juste avant la branche
`refonte/collaboration`. **Toute sonde de vérification se lit en différentiel
contre ces chiffres, jamais en absolu.**

Reproduire : `npm run format:check && npm run lint && npx ng test --watch=false && npm run build`.

## Gate

| Contrôle        | Résultat                                                  |
| --------------- | --------------------------------------------------------- |
| `format:check`  | vert — 2142 fichiers                                      |
| `lint` (oxlint) | **0 avertissement, 0 erreur** — 1867 fichiers, 129 règles |
| `ng test`       | **280 fichiers / 1367 tests verts**, ~18 s                |
| `ng build`      | succès, 3 locales (`en`, `es`, `fr`)                      |

> ⚠️ `format:check` était **rouge** avant `23c4ef14` (artefact d'outillage hors
> `ignorePatterns`). Un gate durablement rouge rend tout rouge ultérieur ambigu.

## Bundle — le point le plus tendu

Par locale (`dist/fireguard-web/browser/en/`) :

| Artefact                               | Taille       |
| -------------------------------------- | ------------ |
| `styles-*.css`                         | **202,0 ko** |
| `main-*.js`                            | 199,5 ko     |
| `polyfills-*.js`                       | 4,1 ko       |
| **Total initial annoncé par le build** | **1,56 Mo**  |

Budget `angular.json` : alerte **700 ko**, erreur **1,7 Mo**.
→ On dépasse déjà l'alerte de **858 ko** et il ne reste que **~140 ko avant
l'erreur**. Le lot 1.8 (sortir `maplibre-gl.css` et `quill.snow.css` des styles
globaux) n'est pas une optimisation de confort : sans lui, W3 fera échouer le build.

## Catalogues i18n

| Fichier           | Unités | Ids distincts |
| ----------------- | ------ | ------------- |
| `messages.xlf`    | 1632   | 1656          |
| `messages.fr.xlf` | 1636   | 1656          |
| `messages.es.xlf` | 1636   | 1656          |

L'écart unités/ids vient d'attributs `id=` autres que ceux des `trans-unit`.
**Invariant à asservir en CI** (lots 2.12 / 3.9) : le nombre d'ids de `trans-unit`
distincts égale le nombre de `trans-unit`, et fr/es ne divergent pas de la source.

## Périmètre du code

233 composants · 33 pages · 16 tables · 2 dataviews · 280 fichiers de specs.
20 pages routées sous `DashboardLayout`.

**Surface à risque pour W1/W2** : 51 specs `ui/**` et 17 specs de layout
interrogent le DOM — soit **68/280 (24 %)** au pire. Les 49 specs d'état sont
immunisées : une seule au rouge signifie que la logique a cassé, pas le balisage.

## SSR

`app.routes.server.ts` : `'**' → RenderMode.Client`. Seuls `auth/**` et
`onboarding/**` sont rendus côté serveur, et `prerendered-routes.json` est vide.
**Le dashboard n'est jamais rendu côté serveur** — aucun harnais d'hydratation
n'est nécessaire pour W1–W3.

## Sondes visuelles (il n'existe aucun harnais de régression visuelle)

À capturer sur les 20 routes avant de commencer W1 :

| Sonde          | Mesure                                                                                              | Seuil                          |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------ |
| **P-WHITE**    | sous `html[data-theme="dark"]`, éléments dont le `background-color` calculé vaut `rgb(255,255,255)` | 0                              |
| **P-CONTRAST** | ratio calculé premier-plan/fond sur les nœuds textuels                                              | ≥ 4,5:1 corps · ≥ 3:1 UI/large |
| **P-OVERFLOW** | `scrollWidth > clientWidth` sur `<body>` à 375/768/1024/1280/1440/1920 px                           | 0                              |
| **P-NODES**    | nœuds DOM en défilant une fixture de 5000 messages (W3)                                             | stable, ≥ 55 fps               |

## Point de retour

`main` @ `45b0ee11`. Tout ce qui suit vit sur `refonte/collaboration` et se
révoque en revenant à ce commit.
