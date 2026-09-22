# FireGuard Web dans Codex

Ce dossier décrit l'outillage local de Codex. Commencer par [AGENTS.md](../AGENTS.md),
puis suivre le [workflow](workflow.md) et les [règles correspondant aux fichiers](rules.md).
L'architecture reste définie dans [ARCHITECTURE.md](../ARCHITECTURE.md); les contrats métier
restent dans les `FEATURE.md`. La palette et les interactions restent régies par
[DESIGN.md](../DESIGN.md) et [PRODUCT.md](../PRODUCT.md).

## Choisir le bon point d'entrée

Un skill fournit une procédure; un agent exécute une responsabilité indépendante et bornée.
La présence d'un spécialiste ne rend pas sa délégation obligatoire.

| Besoin                                | Skill ou référence                                                    | Agent                                                                              | Validation                                       |
| ------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| Page/composant                        | `spartan` + `fg-web-spartan`                                          | `fg-web-component-builder`                                                         | Tests ciblés, build si template, captures utiles |
| Composition native                    | `spartan` + `fg-web-spartan`                                          | `fg-web-spartan-ui`                                                                | Captures desktop/mobile et thèmes affectés       |
| Formulaire / overlay / collection     | Référence ciblée de `fg-web-spartan`                                  | `fg-web-form-builder` / `fg-web-overlay-builder` / `fg-web-collection-builder`     | Inputs/outputs, focus et parcours concernés      |
| Directive / pipe / helper             | `fg-web-directive` / `fg-web-pipe` / `fg-web-util`                    | `fg-web-directive-builder` / `fg-web-pipe-builder` / `fg-web-utils-builder`        | Host/SSR ou entrées-sorties pures                |
| Ownership / routes                    | `fg-web-feature`                                                      | `fg-web-feature-builder` / `fg-web-routing-ssr-builder`                            | Frontières, redirections et SSR/hydratation      |
| Transport / accès / offline           | `fg-web-service`                                                      | `fg-web-service-builder` / `fg-web-access-builder` / `fg-web-offline-sync-builder` | Wire mapping, refus d'accès, replay/conflits     |
| État                                  | `fg-web-store`                                                        | `fg-web-signal-store`                                                              | Transitions, erreurs et courses introduites      |
| Tests                                 | `fg-web-test` + `fg-web-quality`                                      | `fg-web-web-test-writer`                                                           | `ng test` ciblé puis contrôles justifiés         |
| Navigateur                            | `fg-web-e2e`                                                          | `fg-web-e2e-runner`                                                                | Mode SPA/harness/SSR/localisé explicite          |
| Architecture / accessibilité / design | `fg-web-arch-review` / `fg-web-a11y` / référence design               | `fg-web-architecture-reviewer` / `fg-web-a11y-auditor` / `fg-web-design-reviewer`  | Preuves et limites; lecture seule                |
| Contrat API / i18n                    | Référence API de `fg-web-service` / [i18n](references/i18n-review.md) | `fg-web-api-contract-reviewer` / `fg-web-i18n-auditor`                             | Contrats wire / IDs et placeholders              |
| Seconde opinion demandée              | `fg-web-codex-challenge`                                              | Reviewer ciblé du [catalogue](references/agents.md)                                | Findings vérifiés, indépendance déclarée         |

Les commandes, prérequis et limites de chaque contrôle sont dans
[la matrice de validation](references/validation.md).

Le catalogue comprend **13 skills FireGuard**, **2 skills officiels** (`spartan` et
`design-taste-frontend`) et **21 agents FireGuard**. Les noms et frontières des agents sont
décrits dans [le catalogue](references/agents.md). Taste intervient dans son périmètre déclaré,
selon les [contraintes des skills tiers](third-party-skills.md).

## Modèle et effort

[agent-profiles.toml](agent-profiles.toml) déclare une famille de modèle et un effort pour
chaque rôle. Ce sont des profils de délégation : les fichiers d'agents ne fixent aucun modèle.
Un lancement direct hérite de la session. Le parent résout le profil contre le catalogue réel
avant un lancement avec paramètres explicites; voir le [workflow](workflow.md#agent-profiles).
Un identifiant de modèle affiché dans un exemple ne constitue jamais une preuve de disponibilité.

## Démarrage et maintenance

Prérequis de l'outillage : Python 3.11+ et Node.js. Les dépendances du projet sont nécessaires
aux commandes Angular et navigateur, décrites dans [package.json](../package.json). Après un clone, déplacement ou worktree :

```powershell
python -B .codex/scripts/configure.py
python -B .codex/scripts/configure.py --check
```

La configuration conserve les autres paramètres; une entrée MCP ne prouve pas une connexion.
Les hooks nécessitent la revue de confiance du runtime et ne constituent pas un sandbox.
Ne pas modifier la confiance, le modèle global ou les autorisations pour faire passer un contrôle.

Consulter [la matrice de validation](references/validation.md) pour choisir les contrôles.
Les procédures détaillées, la mise à jour des tiers, les limites connues et la migration des
anciennes invocations sont dans [maintenance.md](maintenance.md). Après modification des skills
ou rôles, ouvrir une nouvelle session si le catalogue actif conserve les anciennes entrées.
