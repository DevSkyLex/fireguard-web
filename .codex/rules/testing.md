# Unit specs

> Abridgement of the `fg-web-test` skill — harness code, exemplars, and the full gate live there. Change one, change both.

- Specs live in a **`testing/` folder beside the subject**, named `<subject-file>.spec.ts`. A spec placed next to its subject is a §16 anti-pattern (§14.1).
- The top-level `describe()` is the **exact symbol** under test — `describe('OrganizationMembersStore')` — no prefix, no path (§9.9).
- **Assert only the boundary the unit owns** (§14.1). A store spec proves state transitions over a _mocked_ service; it never re-tests HTTP. A service spec proves transport; it never reads store state.

| Unit                | Assert                                                        | Harness                                                          |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| store               | `CallState` transitions, `patchState` results, event dispatch | mocked service, spied `Dispatcher`                               |
| data-access service | verb, URL, params, body, error propagation                    | `HttpTestingController` + **`httpMock.verify()` in `afterEach`** |
| guard / resolver    | allow vs redirect `UrlTree`                                   | mocked store, mocked `Router.createUrlTree`                      |
| page                | route-param → store orchestration, child wiring               | mock injected stores                                             |
| presentational      | rendering from `input()`, emitted `output()`                  | drive inputs — never inject a store                              |
| directive           | host behaviour or the projected context                       | a **host component**, not `TestBed.createComponent(Directive)`   |
| util                | return value incl. `null`, empty, boundary, fallback          | plain import, no `TestBed`                                       |

- **Never change production code to make a spec pass.** An untestable boundary is a finding, not something to paper over.
- Never weaken an assertion to `toBeTruthy()` where the exact `UrlTree`, enum literal, or emitted payload **is** the contract.
- No `test.only`, `it.only`, or `fdescribe` in a committed spec — it silently skips the suite.
- Strict TS in specs too: type mocks as `{ method: ReturnType<typeof vi.fn> }`, never `any`.

Run with `npx ng test --watch=false --include="src/app/<area>/**/*.spec.ts"`. **The glob must end in `*.spec.ts`** — a directory glob makes the runner load every `.html` as a test entry. Never bare `npx vitest`.
