# Maintenance de l'outillage Codex Web

## Vérifier une modification documentaire ou d'outillage

Depuis la racine du checkout :

```powershell
python -B .codex/scripts/configure.py --check
python -B .codex/scripts/validate.py
python -B -m unittest discover -s .codex/scripts -p 'test_*.py'
node --test .codex/hooks/adapter.test.mjs
node --test .codex/scripts/review-check.test.mjs
```

Pour une modification documentaire, vérifier aussi les liens, noms de skills et références
d'agents. Le validateur contrôle les manifests, les ressources des skills FireGuard,
les profils et l'intégrité des tiers; ses tests ne prouvent pas la qualité des consignes.
Ne pas reconstruire Angular pour une modification limitée à cet outillage.

Après modification d'un script, exécuter ses tests ciblés. `codex mcp list` peut inventorier la
configuration de la session; cela ne prouve pas qu'un appel à chaque serveur réussira.
Les serveurs ne sont initialisés que lorsqu'ils sont utiles.

## Hooks et contrôles structurels

Le manifeste natif `hooks.json` traite `PreToolUse` et `PostToolUse`; ses scripts résolvent
le checkout même depuis un sous-dossier. Le matcher reconnaît le shell canonique `Bash`
et `apply_patch` avec ses alias. Les restrictions du runtime restent souveraines.

Les gardes protègent les fichiers sensibles, les primitives Spartan et les payloads tiers;
le formatage les ignore. Le manifeste ne rend pas ses hooks fiables automatiquement.
Les tests des gardes ne doivent pas modifier les fichiers protégés.

`npm run review:check -- --base <review-base>` inspecte le diff et les sources locales/non suivies.
Son rapport `--json` fournit fichier, ligne, règle et sévérité. Les parseurs TypeScript/Angular
contrôlent notamment types explicites, docblocks, modèles type-only, `$any` et API de drawer.
Les associations action/fermeture sont des avertissements à examiner. Ce contrôle ne remplace
ni le build, ni la review sémantique, ni des captures récentes réellement inspectées.

Limite actuelle d'Oxlint : `typescript/no-floating-promises` est configuré mais le moteur
type-aware n'est ni activé ni installé. Vérifier les flux modifiés et conserver le typage strict;
ne pas ajouter un moteur ni migrer TypeScript implicitement. Référence :
[compatibilité Oxlint](https://oxc.rs/docs/guide/usage/linter/type-aware).

## Mettre à jour un skill tiers

La source, la révision, la licence et les empreintes de `spartan` et
`design-taste-frontend` sont dans `.agents/skills.lock.json`. Préparer une version officielle
dans un dossier temporaire, examiner le diff et la licence, puis remplacer uniquement le
payload sélectionné et actualiser le verrou avec sa provenance. Ne pas utiliser un installateur
général sur les skills FireGuard. Une empreinte ne doit jamais être actualisée pour masquer
une modification locale inexpliquée.

Le verrou v2 normalise les CRLF en LF pour ses extensions texte UTF-8 déclarées; les autres
formats restent comparés octet par octet. Respecter cette politique lors des vérifications.
Les exclusions de formatage/lint et les protections doivent suivre l'inventaire effectif
des packages. Le payload officiel n'encode pas les conventions FireGuard : elles restent
dans `third-party-skills.md`, `DESIGN.md` et le skill `fg-web-spartan`.

## Migration des invocations

Les anciens noms ci-dessous ne sont conservés que dans cette table de migration.
Il n'existe pas de skill de redirection qui dupliquerait leur découverte.

| Ancienne entrée                                        | Entrée ou référence actuelle                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `fg-web-component`                                     | `fg-web-spartan`, référence `components.md`                                                            |
| `fg-web-overlay`                                       | `fg-web-spartan`, références `overlays.md` et `adaptive-composition.md`                                |
| `fg-web-e2e-playwright`                                | `fg-web-e2e/references/playwright.md`                                                                  |
| `fg-web-feature-md`                                    | `fg-web-feature/references/feature-docs.md`                                                            |
| `fg-web-fireguard-naming`                              | `.codex/references/naming.md`                                                                          |
| `fg-web-hydra-data-access`                             | `fg-web-service/references/hydra.md`                                                                   |
| `fg-web-signalstore-recipes`                           | `fg-web-store/references/signalstore.md`                                                               |
| Skill `fg-web-spartan-ui`                              | `fg-web-spartan/references/ui-conventions.md`; le rôle homonyme reste disponible                       |
| `fg-web-web-testing`                                   | `fg-web-test/references/testing.md`                                                                    |
| `fg-web-impeccable`, `impeccable` et ses quatre agents | `design-taste-frontend` dans son périmètre; `fg-web-design-reviewer` pour une critique FireGuard       |
| `fg-web-ui-ux-pro-max`, `ui-ux-pro-max`                | `design-taste-frontend` dans son périmètre; aucune équivalence de base de données UX n'est revendiquée |
| `.codex/compatibility.md`                              | `.codex/workflow.md`                                                                                   |

Les 12 agents FireGuard existants conservent leurs noms; neuf spécialistes sont ajoutés.
Les tâches déjà ouvertes peuvent exposer leur ancien catalogue : poursuivre dans une nouvelle
session après la migration. Ne pas altérer les fichiers historiques `.impeccable/` du projet
ni la configuration d'un autre client pour supprimer ces anciennes invocations.
