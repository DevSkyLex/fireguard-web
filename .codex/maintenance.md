# Maintaining Codex Web tooling

## Check a documentation or tooling change

From the checkout root:

```powershell
python -B .codex/scripts/validate.py
python -B -m unittest discover -s .codex/scripts -p 'test_*.py'
node --test .codex/hooks/adapter.test.mjs
node --test .codex/scripts/review-check.test.mjs
node --test .codex/scripts/check-docblocks.test.mjs
```

For a documentation change, also check links, skill names, and agent references.
The validator checks manifests, FireGuard skill resources, native roles, and
third-party integrity; its tests do not prove that the instructions are sound.
Do not rebuild Angular for a change limited to this tooling.

After changing a script, run its targeted tests. `codex mcp list` can list the
session configuration; it does not prove that calls to every server will succeed.
Servers are initialized only when needed.

Keep one desktop project with API, web and landing attached. API or web can be primary;
Codex automatically discovers configuration from the primary folder. Its peer role declarations
make the same 47 agents available from either primary checkout. Read the owning repository's
AGENTS.md and workflow explicitly when working in a secondary folder.

The shared [configuration example](config.example.toml) contains the peer role declarations
and optional MCP setup. `.codex/config.toml` is local and ignored: copy the example on a new
checkout and replace `<API_CHECKOUT>` / `<WEB_CHECKOUT>` only in the local MCP entries. Preserve
existing local server settings when updating agent declarations. MCP `cwd` binds Angular,
Spartan, Playwright and each Serena server to its intended checkout. Both Serena servers stay
disabled unless needed. Configuration presence does not prove a live connection or trusted hooks.
Do not change personal settings, project trust or approval policy.

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

`npm run lint` runs the existing syntax rules, then the installed `oxlint-tsgolint`
engine with `--type-aware` and `.oxlintrc.type-aware.json`. This focused pass enforces
`typescript/no-floating-promises` without enabling unrelated type-aware rule families.
`npm run lint:type-aware:check` first compiles a real handled/unhandled promise sentinel
and requires exactly one diagnostic; missing engines or silently disabled rules fail.
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

The catalog now contains 25 FireGuard agents, with native model/effort settings.
Peer declarations expose the 22 backend roles from the same primary configuration.
Already-open tasks may still show the old catalog: continue in a new session
after migration. Do not change the project's historical `.impeccable/` files
or another client's configuration to remove these old invocations.

## Shared-catalog validation and runtime acceptance

Run from each checkout:

```powershell
python -B .github/scripts/check_agent_parity.py
python -B -m unittest discover -s .github/scripts -p 'test_agent_parity.py'
```

The parity check reads each vendor's independent source definitions and peer declarations;
it reports 22 API roles, 25 web roles and seven Luna Fast roles without invoking them.
Run in fresh sessions with API and web as primary. Check the native 47-role catalog, exact
models and efforts, Luna Fast under a Standard parent, and Sol Standard under a Fast
parent. Verify actual runtime/request metadata; an agent's assertion is not proof of its tier.
Distinguish parsed configuration, discovered roles, current model availability and observed
execution. Report unsupported clients or unavailable metadata without a silent fallback.

Review only assigned changes; observers ask the parent for cache-writing/runtime evidence.
No catalog check should start every agent or initialize Serena automatically.
