---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.html'
---

# Use the language servers

Two servers are running — typescript-language-server on `.ts`, `@angular/language-server` on
`.html`. They are wired for you; the reflex is not.

**Ask the LSP a question about a symbol. Grep a question about text.** A symbol question
answered by grep alone is a review finding, not a shortcut.

## The reflexes that are not optional

| Situation                                                                    | First tool                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changing a signature, input/output, store member, model field, or token      | `findReferences` on the symbol — the change is complete when every reference in the list has been visited, not when grep stops matching. No aliased import missed, no barrel re-export lost |
| "Who provides / consumes this port"                                          | `findReferences` on the **injection token** (`THEME_PORT`, not the interface — see below)                                                                                                   |
| Creating a file that mirrors an exemplar                                     | `workspaceSymbol` to find the exemplar, `documentSymbol` to read its shape                                                                                                                  |
| "Where does X live" across `@core` / `@shared` / `@features`                 | `goToDefinition` / `workspaceSymbol` — never globbing for the file                                                                                                                          |
| Long file or template, only its structure needed                             | `documentSymbol` — on a template it returns the real control-flow tree (`@if`, `@for`, `as` aliases), not raw markup                                                                        |
| Tailwind class strings, i18n ids in `.xlf`, anything not a resolvable symbol | Grep — that is its lane                                                                                                                                                                     |

## Worktrees: which diagnostics to trust

The servers resolve modules from the checkout they index. A secondary worktree without
`node_modules/` installed floods "cannot find module" diagnostics that mean nothing — run
`npm ci` first, or ignore that worktree's diagnostics entirely and let the gates decide.
Diagnostics arriving for files in a worktree you are **not** currently editing are stale
snapshots of another branch's mid-edit state; never "fix" one without reading the file
first. `npm run quality` remains the decision.

Positions are **1-based on both line and character**, as shown in the editor gutter.

**Diagnostics arrive on their own** after every `Write`/`Edit`, and cost nothing to read.
They are earlier than the gate, not a substitute for it: `npm run quality` still decides when
a task is done, and only `npm run build` proves the strict template check.

## Where the servers stop

**A port has no `implements` edge to find.** Ports here bind through an `InjectionToken` and
`{ provide: TOKEN, useExisting: Service }`, so no class declares `implements ThemePort` —
`goToImplementation` and `findReferences` on the _interface_ both come back empty, and that
is not evidence the port is unused. **Run `findReferences` on the token instead**: on
`THEME_PORT` it returns 11 references across 7 files, including the `provide:` in
`core/theme/theme.provider.ts`. On an interface that genuinely is implemented,
`goToImplementation` works normally and reaches `node_modules` too.

**Inline templates are not covered.** The Angular server is bound to `.html`; a template
written inside a `.ts` `template:` string gets TypeScript's view of it, not Angular's. This
repo uses separate `.html` files throughout, so this only bites if you introduce one.

The **`.mjs` hooks and launcher** under `.claude/` have no server at all: no diagnostics, no
navigation. Read them normally.

> Triplicated by design — the monorepo root and `fireguard-sso-api` each carry their own copy,
> because rules are not a plugin component and do not travel to another session root.
> **Change one, change all three.**
