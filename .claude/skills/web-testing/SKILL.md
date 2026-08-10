---
name: web-testing
description: How to run and write FireGuard Web unit specs — the --include glob trap that breaks the runner, the boundary each unit type owns, and the standard harnesses (HttpTestingController, host component, store with mocked service). Use before running any targeted test or writing a spec.
---

# Running and writing unit specs

`ARCHITECTURE.md` **§14.1** defines what to test; **§9.9** defines naming. This skill is the operational half: the exact commands and harnesses.

## The command — and the trap that bites

```bash
npx ng test --watch=false --include="src/app/<area>/**/*.spec.ts"
```

Two failure modes, both documented in §14.1 and `CLAUDE.md`:

**`--include` is the spec-discovery glob, not a path filter. It must end in `*.spec.ts`.**
A directory glob like `--include="src/app/shared/**"` makes the runner treat every `.html` and `.component.ts` under it as a test entry, and it dies with:

```
No loader is configured for ".html" files
```

That error means your glob is wrong, not that your code is broken.

**Never run bare `npx vitest`.** It misses the project globals and every spec dies with `describe is not defined`.

Full gate, narrowest first:

```bash
npm run format        # oxfmt
npm run lint          # oxlint
npx ng test --watch=false --include="src/app/<area>/**/*.spec.ts"
npm run build         # strict Angular templates — catches what lint cannot
npm run quality       # format:check + lint + test:ci + build, in one shot
```

> `npm run build` is not optional theatre. `tsconfig.spec.json` includes only `*.d.ts` and `*.spec.ts`, so files outside the test program — `src/server.ts`, for instance — can break the build while every test stays green.

## Where the spec goes

`testing/<subject-file>.spec.ts`, beside the subject (§14.1). A spec placed next to its subject instead of in `testing/` is a §16 anti-pattern. The top-level `describe()` is the **exact symbol** under test — `describe('OrganizationMembersStore')` — no prefix, no path.

## The boundary each unit owns (§14.1)

| Unit                                 | Assert                                                                                                      | Harness                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **store**                            | idle→pending→success/error `CallState`, `patchState` results, `withEntities` changes, `eventGroup` dispatch | mock the service (`of()` / `throwError()`), spy on `Dispatcher` |
| **data-access service**              | verb, URL, params, headers, body, response shape, error propagation                                         | `HttpTestingController`, `httpMock.verify()` in `afterEach`     |
| **guard / resolver**                 | allow vs redirect `UrlTree`, store seeding, no duplicate fetch                                              | mock the store method and `Router.createUrlTree`                |
| **page**                             | route-param → store orchestration, child input/output wiring                                                | mock injected stores                                            |
| **presentational / dataview / form** | rendering from `input()`, emitted `output()` values                                                         | drive inputs, assert outputs — never inject a store             |
| **directive**                        | host behaviour, or the projected template context                                                           | **host component**, not `TestBed.createComponent(Directive)`    |
| **util / pipe**                      | return value, including `null`, empty, boundary, fallback                                                   | plain import — no `TestBed` at all                              |

A spec asserting a collaborator's job is testing the wrong unit. A store spec never asserts real HTTP; a service spec never asserts store state.

## Harness — data-access service

```ts
TestBed.configureTestingModule({
  providers: [
    provideHttpClient(),
    provideHttpClientTesting(),
    OrganizationMemberService,
    { provide: ENV_CONFIG, useValue: mockEnv },
  ],
});
// afterEach: httpMock.verify();
```

`httpMock.verify()` is what catches an unexpected or missing request. Omitting it makes the spec pass on a broken service.

## Harness — directive with a projected template

**The repo has zero directives today** — this harness is the template to instantiate when the first one lands, not code to copy from the tree. A template-marker directive is only observable through a host. Mirror what the real consumer does:

```ts
@Component({
  imports: [BoardCardDirective, NgTemplateOutlet],
  template: `<ng-template appBoardCard let-item>{{ item.name }}</ng-template>`,
})
class HostComponent {
  public readonly directive = viewChild(BoardCardDirective);
  public readonly tpl = computed(() => this.directive()?.templateRef ?? null);
}
```

Assert **every** context alias (`$implicit` and each named key) — a missing alias fails silently at runtime, never at build.

## Exemplars to copy

- store — `src/app/features/auth/state/auth/testing/auth.store.spec.ts`
- service — `src/app/features/organization/data-access/services/organization-member/testing/organization-member.service.spec.ts`
- guard — `src/app/features/organization/http/guards/organization-access/testing/organization-access.guard.spec.ts`
- presentational — `src/app/shared/empty-state/ui/components/empty-state/testing/empty-state.component.spec.ts`
- projection through a host — `src/app/shared/layout-slot/ui/components/slot-outlet/testing/slot-outlet.component.spec.ts`

Grep the feature for a sibling spec before writing: reuse its fixtures and builders instead of re-deriving mock payloads.

## Rules that catch real bugs

- Strict TS in specs too: type mocks as `{ method: ReturnType<typeof vi.fn> }`, never `any`.
- Never leave `test.only`, `it.only`, or `fdescribe` — it silently skips the suite.
- Never refactor production code to make a test green. If a unit is untestable at its boundary, report it.
- Don't weaken an assertion to `toBeTruthy()` where the exact `UrlTree`, enum literal, or emitted payload **is** the contract.
- A spec that locks in an anti-pattern (§16) — an ad-hoc `isLoading` flag, a raw `HttpErrorResponse` reaching `errorCallState` — is a bug in the spec. Encode the correct contract instead.
