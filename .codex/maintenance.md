# Maintaining Codex Web tooling

## Check a documentation or tooling change

From the checkout root:

```powershell
python -B .codex/scripts/configure.py --check
python -B .codex/scripts/validate.py
python -B -m unittest discover -s .codex/scripts -p 'test_*.py'
node --test .codex/hooks/adapter.test.mjs
node --test .codex/scripts/review-check.test.mjs
```

For a documentation change, also check links, skill names, and agent references.
The validator checks manifests, FireGuard skill resources, profiles, and
third-party integrity; its tests do not prove that the instructions are sound.
Do not rebuild Angular for a change limited to this tooling.

After changing a script, run its targeted tests. `codex mcp list` can list the
session configuration; it does not prove that calls to every server will succeed.
Servers are initialized only when needed.

## Hooks and structural checks

The native `hooks.json` manifest handles `PreToolUse` and `PostToolUse`; its scripts
resolve the checkout even from a subdirectory. The matcher recognizes the canonical
Codex shell event `Bash` and `apply_patch` with its aliases. Runtime restrictions
remain authoritative.

Guards protect sensitive files, Spartan primitives, and third-party payloads;
formatting skips them. The manifest does not automatically make its hooks trusted.
Guard tests must not modify protected files.

`npm run review:check -- --base <review-base>` inspects the diff and local or
untracked sources. Its `--json` report includes file, line, rule, and severity.
The TypeScript/Angular parsers check explicit types, docblocks, type-only models,
`$any`, and the drawer API, among other things. Action/close associations are
warnings to review. This check does not replace the build, semantic review, or
recent screenshots that were actually inspected.

Current Oxlint limitation: `typescript/no-floating-promises` is configured, but
the type-aware engine is neither enabled nor installed. Review changed flows
and keep strict typing; do not add an engine or migrate TypeScript implicitly.
Reference: [Oxlint compatibility](https://oxc.rs/docs/guide/usage/linter/type-aware).

## Update a third-party skill

The source, revision, license, and hashes for `spartan` and
`design-taste-frontend` are in `.agents/skills.lock.json`. Prepare an official
version in a temporary directory, review the diff and license, then replace only
the selected payload and update the lockfile with its provenance. Do not run a
general installer over FireGuard skills. Never update a hash to hide an
unexplained local modification.

Lockfile v2 normalizes CRLF to LF for its declared UTF-8 text extensions;
other formats are compared byte for byte. Follow this policy during checks.
Formatting/lint exclusions and protections must match the actual package
inventory. The official payload does not encode FireGuard conventions: they
remain in `third-party-skills.md`, `DESIGN.md`, and the `fg-web-spartan` skill.

## Invocation migration

The old names below are retained only in this migration table.
There is no redirect skill that would duplicate their discovery.

| Former entry                                           | Current entry or reference                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `fg-web-component`                                     | `fg-web-spartan`, `components.md` reference                                                   |
| `fg-web-overlay`                                       | `fg-web-spartan`, `overlays.md` and `adaptive-composition.md` references                      |
| `fg-web-e2e-playwright`                                | `fg-web-e2e/references/playwright.md`                                                         |
| `fg-web-feature-md`                                    | `fg-web-feature/references/feature-docs.md`                                                   |
| `fg-web-fireguard-naming`                              | `.codex/references/naming.md`                                                                 |
| `fg-web-hydra-data-access`                             | `fg-web-service/references/hydra.md`                                                          |
| `fg-web-signalstore-recipes`                           | `fg-web-store/references/signalstore.md`                                                      |
| `fg-web-spartan-ui` skill                              | `fg-web-spartan/references/ui-conventions.md`; the agent with the same name remains available |
| `fg-web-web-testing`                                   | `fg-web-test/references/testing.md`                                                           |
| `fg-web-impeccable`, `impeccable`, and its four agents | `design-taste-frontend` within its scope; `fg-web-design-reviewer` for a FireGuard critique   |
| `fg-web-ui-ux-pro-max`, `ui-ux-pro-max`                | `design-taste-frontend` within its scope; no equivalent UX database is claimed                |
| `.codex/compatibility.md`                              | `.codex/workflow.md`                                                                          |

The 12 existing FireGuard agents keep their names; nine specialists have been added.
Already-open tasks may still show the old catalog: continue in a new session
after migration. Do not change the project's historical `.impeccable/` files
or another client's configuration to remove these old invocations.
