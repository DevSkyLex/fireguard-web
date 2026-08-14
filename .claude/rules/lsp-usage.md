---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.html'
---

# Use the language servers

Two servers are running — typescript-language-server on `.ts`, `@angular/language-server` on
`.html`. They are wired for you; the reflex is not.

**Ask the LSP a question about a symbol. Grep a question about text.**

- `findReferences` before `Grep` for "who uses this". Grep matches a string, the LSP matches
  the symbol: no aliased import missed, no barrel re-export lost, no unrelated same-named
  member counted.
- `goToDefinition` before guessing a path across `@core` / `@shared` / `@features`.
  `workspaceSymbol` before globbing for a component or store file.
- `documentSymbol` before reading a long file whole — on a template it returns the real
  control-flow tree (`@if`, `@else if`, `@for`, `as` aliases) rather than raw markup.
- Grep stays right for Tailwind class strings, i18n ids in `.xlf`, and anything that is not a
  resolvable symbol.

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
