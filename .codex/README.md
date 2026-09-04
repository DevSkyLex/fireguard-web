# FireGuard dans Codex

Configuration locale, autonome : Codex lit `AGENTS.md`, `.codex/workflow.md` et les règles
applicables de `.codex/rules.md`. Les procédures n'appellent plus les fichiers de Claude.
La configuration de l’autre client reste conservée, sans chemin vers elle dans cet outillage.

## Organisation

| Emplacement                           | Rôle                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `.agents/skills/fg-web-*/`            | 14 skills FireGuard, avec instructions autonomes et métadonnées Codex.                                             |
| `.agents/skills/spartan/`             | Skill officiel Spartan pour la découverte, la composition, le CLI et le MCP de la bibliothèque.                    |
| `.agents/skills/impeccable/`          | Impeccable 4.1.3 officiel, avec adaptation locale supprimant les chemins Claude.                                   |
| `.agents/skills/ui-ux-pro-max/`       | Paquet produit par l'installateur officiel `ui-ux-pro-max-cli` 2.15.0 pour Codex : données, scripts et références. |
| `.agents/skills.lock.json`            | Sources, révisions/versions, licences et empreintes SHA-256 des paquets externes.                                  |
| `.codex/agents/`                      | 12 rôles FireGuard et les 4 rôles officiels d'Impeccable, enregistrés sans modifier leur contenu.                  |
| `.codex/rules/`, `.codex/references/` | Règles de chemin et référence de nommage propres à Codex.                                                          |
| `.codex/hooks/`                       | Gardes locaux, adaptation des événements Codex et formatage des fichiers touchés.                                  |
| `.codex/config.toml`                  | Les cinq MCP existants ; aucun choix de modèle, de sandbox ou d'approbation ajouté.                                |

Les skills sont découverts dans `.agents/skills`. Les rôles sont chargés depuis
`.codex/agents`, d'où l'enregistrement des quatre fichiers fournis par Impeccable.
Voir la documentation officielle [skills](https://developers.openai.com/codex/skills)
et [subagents](https://developers.openai.com/codex/subagents).

## Utilisation

Exemples : `$spartan` fournit la procédure officielle de la bibliothèque et
`$fg-web-spartan` y ajoute les contraintes FireGuard ; `$fg-web-e2e` sert à une
vérification dans le navigateur, `$impeccable critique` à une critique et
`$ui-ux-pro-max` pour une recherche UX ciblée. Les demandes ordinaires peuvent aussi
sélectionner un skill via sa description. Les principes de `third-party-skills.md`
maintiennent le thème neutral/Nova et les conventions Spartan, sans redéfinir leur direction visuelle.

Demander un subagent par son nom quand une responsabilité indépendante le justifie.
Les douze rôles FireGuard conservent leurs noms `fg-web-*`, lisent les skills locaux et
héritent du modèle courant. Les auditeurs restent en lecture seule. Aucune seconde
opinion `codex exec` n'est lancée automatiquement.

Après l'installation, poursuivre dans un nouveau tour ; si le catalogue affiché conserve
les anciens noms, ouvrir une nouvelle tâche/session Codex. Les outils déjà exposés dans
une tâche active ne prouvent pas le rechargement des fichiers de rôles.

## Hooks et déplacement du projet

Le manifeste natif `hooks.json` traite `PreToolUse` et `PostToolUse`. Il résout les scripts
depuis le checkout, y compris lorsque la commande part d'un sous-dossier. Le matcher
inclut `Bash`, nom canonique de l'événement shell Codex, et `apply_patch`/ses alias.
Les hooks restent soumis à la [revue de confiance de Codex](https://developers.openai.com/codex/hooks) ;
l'installation ne modifie pas les autorisations. Les scripts inspectent les patches,
gardent les protections existantes et utilisent les outils locaux de formatage.
Ils ne constituent pas un sandbox : les restrictions de fichiers du runtime restent souveraines.

Le hook optionnel du détecteur Impeccable n'est pas activé. Il se gère avec
`$impeccable hooks`, sans remplacer le manifeste FireGuard ni le déclarer fiable automatiquement.

Après un clone, déplacement ou worktree, relier les chemins des MCP au checkout courant :

```powershell
python .codex/scripts/configure.py
python .codex/scripts/configure.py --check
```

Le script conserve les autres paramètres. Une entrée MCP valide ne garantit pas sa connexion :
les serveurs sont initialisés seulement lorsqu'ils sont utiles.

## Nettoyage des anciens adaptateurs

Les 23 entrées initiales sont remplacées par 14 skills métier et 2 skills externes.
Les références utiles ont été rapprochées du skill qui les consomme :

| Ancienne entrée              | Destination                                   |
| ---------------------------- | --------------------------------------------- |
| `fg-web-e2e-playwright`      | `fg-web-e2e/references/playwright.md`         |
| `fg-web-feature-md`          | `fg-web-feature/references/feature-docs.md`   |
| `fg-web-fireguard-naming`    | `.codex/references/naming.md`                 |
| `fg-web-hydra-data-access`   | `fg-web-service/references/hydra.md`          |
| `fg-web-signalstore-recipes` | `fg-web-store/references/signalstore.md`      |
| `fg-web-spartan-ui`          | `fg-web-spartan/references/ui-conventions.md` |
| `fg-web-web-testing`         | `fg-web-test/references/testing.md`           |
| `fg-web-impeccable`          | Skill officiel `impeccable`                   |
| `fg-web-ui-ux-pro-max`       | Skill officiel `ui-ux-pro-max`                |
| `.codex/compatibility.md`    | `.codex/workflow.md`                          |

## Maintenance et vérification

Prérequis des scripts locaux : Python 3.11+, Node.js et les dépendances de développement
déjà déclarées par le projet. Aucune dépendance de l'application n'est ajoutée.

```powershell
python .codex/scripts/validate.py
python -B -m unittest discover -s .codex/scripts -p 'test_*.py'
node --test .codex/hooks/adapter.test.mjs
codex mcp list
```

Le validateur vérifie les manifests, les références des skills FireGuard et l'intégrité des
paquets externes. Les tests des hooks ne lisent pas de secret et n'exécutent pas de commande Git destructive.
Pour une modification limitée à cet outillage, ces contrôles remplacent un build Angular inutile.

Mettre à jour les skills externes dans un dossier de préparation avec la source et
l'installateur officiels, puis comparer le contenu et actualiser le verrou d'intégrité.
Ne pas lancer un installateur général directement sur les skills FireGuard : UI UX Pro Max
installe aussi des skills compagnons qui ne font pas partie de cette sélection.
Les configurations oxfmt et oxlint excluent ces deux paquets pour préserver le contenu officiel.
L’adaptation locale d’Impeccable et ses empreintes avant/après sont tracées dans le verrou.
La réappliquer lors des mises à jour ; le validateur refuse tout retour de chemins Claude.
Toute autre modification des paquets externes doit être explicitement autorisée. Les quatre copies d'agents
Impeccable doivent rester identiques à celles de son paquet.

Sources : [Impeccable](https://github.com/pbakaus/impeccable),
[UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
