---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.html'
---

# Use the language server

Code intelligence on this app comes from **Serena over MCP**, tool prefix
`mcp__serena-web__`, backed by Serena's `angular` language server. The native `LSP` tool is
gone — its plugin was removed on 2026-08-26 because it never reached subagents and Serena
covers the same ground from both. See `.claude/rules/lsp-availability.md`.

One server, not two: it indexes every `.ts` **and** all 249 `.html` templates, so a
`find_referencing_symbols` on a component surfaces the templates that use it.

**Ask Serena a question about a symbol. Grep a question about text.** A symbol question
answered by grep alone is a review finding, not a shortcut.

## The reflexes that are not optional

| Situation | First tool |
| --- | --- |
| Changing a signature, input/output, store member, model field, or token | `find_referencing_symbols` on the symbol, **then `Grep` over `*.spec.ts`** — the list is not exhaustive, see below. No aliased import missed, no barrel re-export lost |
| "Who provides / consumes this port" | `find_referencing_symbols` on the **injection token** (`THEME_PORT`, not the interface — see below) |
| "What implements or extends this" | `find_implementations` — it works here, unlike on the backend |
| Creating a file that mirrors an exemplar | `find_symbol` to find the exemplar, `get_symbols_overview` to read its shape |
| "Where does X live" across `@core` / `@shared` / `@features` | `find_declaration` / `find_symbol` — never globbing for the file |
| Long file or template, only its structure needed | `get_symbols_overview` |
| What is broken in a file you just edited | `get_diagnostics_for_file` — **it is not pushed to you, you must ask** |
| Tailwind class strings, i18n ids in `.xlf`, anything not a resolvable symbol | Grep — that is its lane |

Serena addresses symbols by **name path** and **relative path**, not by line/character
position: `find_referencing_symbols(name_path: "HydraApiService", relative_path: "src/app/core/api/services/hydra-api/hydra-api.service.ts")`.
Paths come back with Windows backslashes and are accepted either way.

## The cold index answers wrong, not empty

Right after the server starts, repeated identical calls can return a partial count before
settling. **Never record "no consumers" from a first call** — repeat it once and take the
larger answer.

`.claude/worktrees/` is excluded through `ignored_paths` in `.serena/project.yml`, because
Serena ignores `.git/info/exclude` and would otherwise index every stale worktree as
duplicate symbols.

## The specs are invisible — the one thing you must work around

**`find_referencing_symbols` returns no `*.spec.ts` file, ever.** `tsconfig.app.json` carries
`"exclude": ["src/**/*.spec.ts"]`, and the language server loads that project, so specs are
parsed but linked to nothing.

Measured on `InterventionService`: Serena returns **14 files**, `Grep -w` finds **28 real code
references**, and the 14 missing ones are exactly the 14 specs — each with a genuine `import`,
verified one by one. `find_implementations` has the same hole: `TestResourceService`, which
`extends HydraApiService` inside `hydra-api.service.spec.ts`, is absent from its 38 results.

**So a rename or a signature change is never complete on Serena's list alone.** Finish it with
`Grep -w "<Symbol>" src --include="*.spec.ts"`. The gate catches it eventually — `npx ng test`
fails — but hours later and without telling you which call site moved.

This is web-only. The backend server indexes `tests/` normally: on
`AuditExportTooLargeException`, four of Serena's eight files are test files.

## Where the server stops

**A port has no `implements` edge to find.** Ports here bind through an `InjectionToken` and
`{ provide: TOKEN, useExisting: Service }`, so no class declares `implements ThemePort` —
`find_implementations` and `find_referencing_symbols` on the _interface_ both come back
empty, and that is not evidence the port is unused. **Run `find_referencing_symbols` on the
token instead**: on `THEME_PORT` it reaches the `provide:` in `core/theme/theme.provider.ts`.
On an interface that genuinely is implemented, `find_implementations` works normally — on
`HydraApiService` it returns 38 entries.

**There is no call hierarchy** — no tool answers "who calls this method".
`find_referencing_symbols` on the method is the nearest thing.

**`Grep` over-reports where Serena under-reports.** On `InterventionService`, nine of `Grep`'s
extra hits were JSDoc mentions (`mirrors {@link InterventionService.downloadAttachment}`), not
references. Neither tool is trustworthy alone on this side: Serena's list is precise but short
by every spec, `Grep`'s is complete but padded with prose.

**The `angular` server drops `.js` / `.mjs` / `.cjs`.** The repo's 111 such files — hooks,
launchers, config — are not symbol-searchable at all. The plain `typescript` server used to
index them; this one trades that for the templates. Read them with Grep and Read.

**Inline templates are not covered.** A template written inside a `.ts` `template:` string
gets TypeScript's view of it, not Angular's. This repo uses separate `.html` files throughout
(§10.2), so this only bites if you introduce one.

**Diagnostics no longer arrive on their own.** The removed plugin pushed them after every
`Write`/`Edit`; `get_diagnostics_for_file` is on demand only. They remain earlier than the
gate, not a substitute for it: `npm run quality` still decides when a task is done, and only
`npm run build` proves the strict template check.

> Triplicated by design — the monorepo root and `fireguard-sso-api` each carry their own copy,
> because rules are not a plugin component and do not travel to another session root.
> **Change one, change all three.**
