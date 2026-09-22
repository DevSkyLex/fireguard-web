# Directives and pipes

**The suffix rule is the opposite of components.** A component drops `Component`; a **directive keeps `Directive`** and a pipe keeps `Pipe` (§9.3). `InfiniteScrollDirective`, not `InfiniteScroll`.

## Directives

- Selector is `[appCamelCase]` — `[appInfiniteScroll]`, `[appBoardCard]`. `app` is the only permitted prefix (§9.4).
- Domain-aware directives belong to the owning feature's `ui/`; generic directives belong to `shared/<concept>/ui/directives/<name>/`. Use the lowest owning scope, with the required public barrel and `testing/`. Complete an existing concept before introducing another (§8.5, §9.2).
- **SSR is not optional.** Anything touching `document`, `window`, `IntersectionObserver`, or `ResizeObserver` is guarded with `isPlatformBrowser(this.platformId)` and torn down in `ngOnDestroy`. An unguarded directive breaks the whole route on the server, not just itself.
- A template-marker directive needs `ngTemplateContextGuard` to type its `let-` bindings. Put reusable context contracts in the owner's `models/`: an `interface` takes `<name>-context.interface.ts`; a `type` alias takes `<name>-context.type.ts` (§9.2, §10.10).
- Same member rules as components: explicit access modifier, explicit type, `readonly`; outputs past-tense (`scrolled`, never `onScroll`).

## Pipes

Inspect current pipe exemplars and the rules in §9.2 and §8.5.

- Before building one, check that a `computed()`, a `utils/` function, or an Angular built-in is not the right answer — in a signals codebase it usually is. Apply the rule of three (§2.9).
- Pure — never `pure: false`, which runs on every change-detection cycle and defeats the `OnPush` discipline. No DI, no `inject()`.
- `shared/<concept>/ui/pipes/<name>/`, name prefixed `app` to stay distinct from the built-ins.
- Update architecture documentation in the same change if a new contract changes its normative statements.
