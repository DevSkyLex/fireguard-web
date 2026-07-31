---
paths:
  - 'src/app/**/*.directive.ts'
  - 'src/app/**/*.pipe.ts'
---

# Directives and pipes

**The suffix rule is the opposite of components.** A component drops `Component`; a **directive keeps `Directive`** and a pipe keeps `Pipe` (§9.3). `InfiniteScrollDirective`, not `InfiniteScroll`.

## Directives

- Selector is `[appCamelCase]` — `[appInfiniteScroll]`, `[appBoardCard]`. `app` is the only permitted prefix (§9.4).
- Live in `shared/<concept>/ui/directives/<name>/` with `index.ts` and `testing/`. If the directive completes an **existing** concept's contract, put it there rather than creating a new concept (§8.5).
- **SSR is not optional.** Anything touching `document`, `window`, `IntersectionObserver`, or `ResizeObserver` is guarded with `isPlatformBrowser(this.platformId)` and torn down in `ngOnDestroy`. An unguarded directive breaks the whole route on the server, not just itself.
- A template-marker directive needs `ngTemplateContextGuard`, or every `let-` binding stays untyped. The context interface is a **type**, so it lives in the concept's `models/` as `<name>-context.type.ts` — never beside the directive (§10.10).
- Same member rules as components: explicit access modifier, explicit type, `readonly`; outputs past-tense (`scrolled`, never `onScroll`).

## Pipes

**There are zero pipes in this codebase.** The shape is prescribed by §9.2 and §8.5 but has no exemplar.

- Before building one, check that a `computed()`, a `utils/` function, or an Angular built-in is not the right answer — in a signals codebase it usually is. Apply the rule of three (§2.9).
- Pure — never `pure: false`, which runs on every change-detection cycle and defeats the `OnPush` discipline. No DI, no `inject()`.
- `shared/<concept>/ui/pipes/<name>/`, name prefixed `app` to stay distinct from the built-ins.
- **The first pipe must update `ARCHITECTURE.md` in the same change** — §9.2 currently says `.pipe.ts` is "currently unused", and §14.3 makes an unrecorded deviation a defect.
