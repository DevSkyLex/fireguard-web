# Frontend coverage

The acceptance threshold is **90% of executable application lines**, independently
of backend coverage. Branches, statements and functions remain visible in reports
but are not subject to that line threshold.

## Complete check

```sh
npm run test:coverage
```

This invokes the Angular unit-test builder, runs the complete suite once and fails
when tests fail or global line coverage is below 90%. It produces the HTML report,
LCOV and JSON summaries in `coverage/fireguard-web/`. Open
`coverage/fireguard-web/index.html` to inspect uncovered behavior by file.

The configured scope is `src/**/*.ts`, including unimported files, route definitions,
providers, pages, stores, adapters and SSR/browser entry points. It excludes:

- Test files and `testing/` fixtures, plus the runner's standard declaration/tooling exclusions.
- `src/environments/`, containing deployment configuration.
- `src/app/shared/ui/`, the installed Spartan Helm sources declared in `components.json`.

Handwritten shared components and utilities remain in the denominator. No feature
or application failure path is excluded. Templates and CSS are not TypeScript
executable lines. Adding exclusions to satisfy the threshold is not acceptable.

## GitHub enforcement

The CI job **Unit and Integration Tests** runs `npm run test:coverage` on pull
requests, pushes to `develop`/`main`, manual runs and reusable-workflow calls.
The threshold comes from `angular.json`, so the local and CI commands share the
same scope and minimum. A failed test or coverage below 90% fails the job.

The job summary shows the line counts and percentage. The `frontend-coverage`
artifact keeps the LCOV and JSON summary for 14 days, including when the threshold
fails. Artifact and Codecov uploads are diagnostic; their availability cannot
turn a failed coverage check into a pass.

After publishing the workflow and its first run, make **Unit and Integration
Tests** a required status check in the rules for both `develop` and `main`.
An administrator must configure this repository setting separately; changing
workflow YAML alone does not prevent a merge when no checks are required.

## Focused development

```sh
npx ng test --watch=false --include="src/app/features/auth/**/*.spec.ts"
```

Use focused runs while writing tests, then the complete check for acceptance. A
targeted coverage report cannot establish the application's global percentage;
it replaces the report in its output directory. Keep temporary targeted reports
in a separate ignored `coverage/` directory when comparing measurements.

Tests assert the owning boundary: HTTP request contracts, store state and errors,
page orchestration, component inputs/outputs, and browser resource lifecycle.
The scene tests retain real Three geometry and substitute the GPU boundary;
IndexedDB tests distinguish request completion from transaction completion.
These checks complement browser tests; jsdom does not prove visual rendering,
real GPU behavior or browser navigation.

Do not hide uncovered code with ignore annotations, generate tests that merely
invoke methods, or weaken expected behavior to make a report pass. Preserve local
drafts, authorization denial paths, scope isolation and retry/idempotency contracts
when selecting additional scenarios.
