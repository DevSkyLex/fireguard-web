# Architecture tests

[Repository test index](../README.md) · [Normative architecture](../../ARCHITECTURE.md) · [Testing guide](../../docs/guides/testing.md)

```sh
npm run test:architecture
```

The command typechecks the suite and runs Vitest with `tests/architecture/vitest.config.ts`. It also runs through the existing `npm run lint` CI gate.

## Application assertions

`project.spec.ts` reads authored TypeScript under `src/app/`, resolves local dependencies using the project's actual `tsconfig.json` (including inherited configuration), and checks:

- core independence from features and layouts;
- shared access to feature ports only;
- cross-owner dependencies through public feature/concern entry points;
- narrow barrels declared in the owner's `FEATURE.md` public entry table, with named authorized consumers;
- lazy route imports limited to route trees and page entry components;
- unresolved local imports, reported with the source file and line;
- explicit named exports, without public leakage of testing helpers, adapters, internal symbols or pages;
- layouts consuming ports and widgets instead of concrete feature state, access or transport services, including indirect named re-exports;
- forms, tables and dataviews staying independent of feature state, HTTP transport and router orchestration;
- components explicitly annotated `@presentation` following the same rule, while feature-owned orchestration widgets retain their ownership;
- ownership documents for business features and valid public entry declarations;
- static execution cycles, with concrete file/line chains.

Imports, re-exports, literal dynamic imports, import type expressions and TypeScript import-equals declarations are inspected. Application modules are parsed, never executed. External packages, colocated specs and `testing/` helpers are outside this boundary.

Nearest-parent `FEATURE.md` determines ownership, so nested features remain independent of their parent. Missing contracts now fail instead of silently giving a nested feature its parent's ownership. Standard concern barrels follow ARCHITECTURE.md §13.2. A deeper `index.ts` needs an explicit declaration in the owner's contract:

```md
## Public entry points

| Entry point                   | Consumers |
| ----------------------------- | --------- |
| `providers/bootstrap`         | `app`     |
| `state/message-thread/events` | `account` |
```

Consumer names are feature paths relative to `src/app/features`; `app` is reserved for application composition. A consumer cannot grant itself access by mentioning an entry in its own documentation. Prose, code fences and example tables outside this section are ignored. Entry paths must resolve to an existing owner-local barrel and consumers must have contracts. Private data-access implementation buckets and pages remain unavailable to cross-owner imports.

The execution graph uses TypeScript's emitted syntax: erased type references and unused bindings are excluded, as are deferred dynamic imports. Static imports and re-exports remain dependencies. Generated Spartan exports under `shared/ui/` are outside authored export rules. Local page helpers stay private; publishing a page from a feature root fails.

The suite does not execute application modules or prove business ownership from syntax. Computed dynamic import paths, wrapped implementation factories and the intended set of exported public symbols still require compiler/build checks and review.

## Detector regression tests

`boundaries.spec.ts` and `structure.spec.ts` build isolated temporary TypeScript projects with allowed and forbidden dependencies. Cases cover inheritance across configuration directories, exact/wildcard alias precedence and fallback paths, relative imports, nested ownership, explicit consumer approvals, private leakage through aliased re-exports, presentation responsibilities and runtime/type/lazy cycles. Fixtures are removed after each test.

There is no baseline capture command or silent exception list. Fix the dependency or update an explicitly approved contract when a boundary fails.
