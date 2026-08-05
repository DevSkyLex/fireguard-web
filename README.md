# FireGuard Web

Angular 21 frontend for FireGuard, an organization-scoped platform for planning,
executing and publishing fire-safety field interventions (facilities,
equipment, inspections, maintenance, checklists) with offline-first field
support and organization collaboration (channels, direct messages, an AI
assistant).

Talks to [`fireguard-sso-api`](../fireguard-sso-api) (Symfony / API Platform,
OAuth2/OIDC) as its backend.

## Tech stack

- **Angular 21** — standalone components, signals (`input()`, `computed()`,
  `signal()`, `linkedSignal()`), `ChangeDetectionStrategy.OnPush`
- **NgRx SignalStore** — `patchState`, `rxMethod` + `tapResponse`, typed
  `CallState` async lifecycle (`@core/request-state`)
- **spartan/ui** — headless `@spartan-ng/brain` primitives plus helm components
  generated into `src/app/shared/ui/`, styled with Tailwind and theme tokens
- **Tailwind CSS v4**
- **SSR / hydration** via `@angular/ssr` and Express
- **Strict TypeScript**, `oxlint` + `oxfmt` for lint/format, `vitest`/`ng test`
  for unit tests, Playwright for hermetic end-to-end tests

## Getting started

### Requirements

- Node.js 22+ and npm
- A running instance of [`fireguard-sso-api`](../fireguard-sso-api) (see that
  repo's README for `make docker-up`) for real API calls in development

### Install and run

```bash
npm ci
npm start
```

`npm start` runs `ng serve` with SSR enabled by default. Localized dev servers
are also available: `npm run start:fr`, `npm run start:es`.

Environment configuration follows Angular's standard file-replacement
pattern: application code imports `@env/environment`, and `angular.json`
swaps in `src/environments/environment.ts` (production) or
`environment.development.ts` (development) at build time — see
`ARCHITECTURE.md` §11 and `DEPLOYMENT.md` for details.

## Available scripts

| Script                            | Description                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `npm start`                       | `ng serve` — dev server with SSR                                                  |
| `npm run build`                   | Production build (strict templates, SSR)                                          |
| `npm run watch`                   | Development build in watch mode                                                   |
| `npm test`                        | `ng test` — unit tests, watch mode                                                |
| `npm run test:ci`                 | `ng test --watch=false` — unit tests, single run                                  |
| `npm run lint`                    | `oxlint` against the whole project                                                |
| `npm run lint:fix`                | `oxlint --fix`                                                                    |
| `npm run format`                  | `oxfmt` — apply formatting                                                        |
| `npm run format:check`            | `oxfmt --check` — verify formatting                                               |
| `npm run quality`                 | `format:check` + `lint` + `test:ci` + `build` (the CI gate, reproducible locally) |
| `npm run i18n:extract`            | Extract i18n message catalogs to `src/locale`                                     |
| `npm run e2e:install`             | Install Playwright browser binaries (once)                                        |
| `npm run e2e:test`                | Run the full Playwright end-to-end suite                                          |
| `npm run e2e:chromium`            | Run e2e tests on Chromium only (fastest feedback)                                 |
| `npm run e2e:ui`                  | Playwright interactive UI mode                                                    |
| `npm run serve:ssr:fireguard-web` | Run the built SSR server (`dist/fireguard-web/server/server.mjs`)                 |

## Project structure

Feature-first architecture with strict ownership rules — see `ARCHITECTURE.md`
for the full normative reference (layer model, dependency direction, folder
templates, state patterns) and `AGENTS.md` for the condensed working rules.

```text
src/app/
  core/       # app-wide infrastructure only (HTTP transport, SSR/hydration, theme, request-state, ...)
  layouts/    # shell composition (dashboard, split, focused, workspace layouts)
  features/   # owned business workflows end-to-end (see below)
  shared/     # generic, domain-agnostic UI primitives and pure utilities
```

Top-level features (each documented in its own `FEATURE.md`):

| Feature         | Owns                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`          | Sign-in, MFA, registration, password reset, session/token bootstrap                                                                                                     |
| `account`       | User profile, sessions, trusted devices, notifications, global permission helpers                                                                                       |
| `onboarding`    | Mandatory guided organization activation wizard                                                                                                                         |
| `main`          | Root landing route (`/`), redirects into the active organization workspace                                                                                              |
| `organization`  | Organization context, members, roles, billing/subscription, dashboard, and nested subfeatures: `facilities`, `equipments`, `inspections`, `checklists`, `interventions` |
| `collaboration` | Organization channels, direct conversations, messages, presence, and the AI assistant                                                                                   |
| `error`         | Static error pages (404 / 403 / 500 / maintenance)                                                                                                                      |

## Testing

- **Unit / integration**: `npx ng test --watch=false` (never bare `vitest` —
  it misses project globals). Specs target the architectural boundary the
  unit owns: stores, data-access services, guards/resolvers, pages,
  presentational components.
- **End-to-end**: Playwright, fully hermetic — every backend call is mocked at
  the network layer, so no API, database, or Mercure hub needs to run. See
  `e2e/README.md` for suite layout, coverage scope, and how to add a test for
  a new page.

## Documentation

- `ARCHITECTURE.md` — normative frontend architecture (layers, dependency
  direction, state patterns, HTTP transport, public APIs)
- `AGENTS.md` — condensed working rules for AI coding agents
- `PRODUCT.md` — product purpose, users, brand personality, design principles
- `CLAUDE.md` — entry point for Claude Code in this repo
- `DEPLOYMENT.md` — VPS deployment via GitHub Actions, Docker, and Traefik
- `src/app/<layer>/README.md` and `src/app/features/**/FEATURE.md` —
  per-concern and per-feature documentation

## Deployment

Deployed to a VPS via GitHub Actions (CI → Docker image → GHCR → deploy) with
Docker Compose and Traefik. See `DEPLOYMENT.md` for the full pipeline,
required GitHub secrets/variables, and first-deployment checklist.

## License

Proprietary. See internal licensing guidance for distribution and use.
