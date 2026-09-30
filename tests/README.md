# Repository tests

Application unit and integration specs stay beside their owner under `src/` and run through Angular's test builder. Repository-wide architecture, API fixture contracts and browser suites live here.

```text
tests/
├── architecture/
│   ├── project.spec.ts          # Rules checked against the real application
│   ├── boundaries.spec.ts       # Allowed and forbidden dependency fixtures
│   ├── structure.spec.ts        # Export, orchestration, ownership and cycle fixtures
│   ├── support/                 # TypeScript analysis and isolated fixture builder
│   └── tsconfig.json
├── contracts/
│   ├── README.md
│   ├── validator.spec.ts
│   ├── ssr-fixtures.spec.ts
│   ├── support/openapi.ts
│   ├── fixtures/                # Versioned API export and source fingerprint
│   ├── sync-openapi.mjs
│   └── tsconfig.json
└── e2e/
    ├── README.md
    ├── <area>/*.spec.ts
    ├── support/
    ├── harness/
    ├── localized/
    ├── ssr/
    └── scripts/
```

| Boundary                     | Command                     | Reference                                    |
| ---------------------------- | --------------------------- | -------------------------------------------- |
| Architecture                 | `npm run test:architecture` | [Architecture tests](architecture/README.md) |
| API fixture contracts        | `npm run test:contracts`    | [API contracts](contracts/README.md)         |
| Application unit/integration | `npm run test:ci`           | [Testing guide](../docs/guides/testing.md)   |
| Browser scenarios            | `npm run e2e:chromium`      | [E2E guide](e2e/README.md)                   |
| Browser helper mechanics     | `npm run e2e:harness`       | [Harness boundary](e2e/README.md)            |

Architecture and API contracts use separate Vitest Node configurations. Playwright collects only `tests/e2e/`; Angular application tests retain their existing scope.
