---
description: Create an Angular directive as a complete unit folder — behavioral (SSR-safe) or template-marker with a typed ngTemplateContextGuard.
argument-hint: '<name> [--context-guard] — e.g. "auto-focus" or "board-card --context-guard"'
---

Delegate to the **fg-directive-builder** subagent: $ARGUMENTS

Require it to:

1. **Name the kind first** — behavioral (works on the host element) or template-marker (projects a typed `<ng-template>`). They have different anatomies.
2. Place it: normally `shared/<concept>/ui/directives/<name>/`. If it completes an **existing** concept's contract, put it there rather than creating a new concept.
3. Emit `index.ts`, `<name>.directive.ts`, `testing/`, and re-export through the concept barrel.
4. Honour naming: the class **keeps** the `Directive` suffix (unlike components), the selector is `[appCamelCase]`.
5. For a behavioral directive: guard every DOM access with `isPlatformBrowser` and tear down in `ngOnDestroy` — this app server-renders, and an unguarded directive breaks the whole route.
6. For a template-marker: add `ngTemplateContextGuard`, and put the context interface in the concept's `models/` as `<name>-context.type.ts` (`models/` is type-only — a hook blocks runtime files there).
7. Write the spec with a **host component**, not `TestBed.createComponent(Directive)`, and assert **every** context alias.
8. Run `npm run format && npm run lint && npx ng test --watch=false --include="src/app/shared/**/*.spec.ts" && npm run build`.
