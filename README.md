# FireGuard Web

Angular frontend for FireGuard: organization-scoped fire-safety work, field
interventions, offline workflows and collaboration. It uses the
[FireGuard API](https://github.com/DevSkyLex/fireguard-api).

## Tech stack

Standalone Angular, signals, Signal Forms, NgRx SignalStore, Spartan Brain/Helm,
Tailwind, Hydra/JSON-LD transport, SSR and hydration. Exact dependency versions
live in [package.json](package.json) and its lockfile; architectural requirements
live in [ARCHITECTURE.md](ARCHITECTURE.md).

## Getting started

### Requirements

- Node.js 22 and npm, matching the CI runtime.
- A configured API for development against real data. Hermetic browser tests
  use their own mocked API and need no backend or Mercure service.

### Install and run

```sh
npm ci
npm start
```

The development server uses SSR. See the [local development guide](docs/guides/local-development.md)
for configuration and localized servers. Hosted containers resolve public runtime
configuration at startup; [DEPLOYMENT.md](DEPLOYMENT.md) defines that contract.

## Available scripts

[package.json](package.json) is the command inventory. The usual entry points are:

| Command                 | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `npm start`             | Development server                                 |
| `npm run build`         | Strict production build, including SSR             |
| `npm run lint`          | Source and architecture lint                       |
| `npm run format:check`  | Formatting without rewriting                       |
| `npm run test:coverage` | Complete unit/integration suite and line threshold |
| `npm run e2e:chromium`  | Hermetic Chromium scenarios                        |
| `npm run quality`       | Formatting, lint, unit tests and build             |

Coverage acceptance is defined in [COVERAGE.md](COVERAGE.md).

## Project structure

```text
src/app/
  core/       # application infrastructure
  layouts/    # shell composition
  features/   # business owners and public contracts
  shared/     # domain-agnostic building blocks
docs/         # explanations, development guides and operational references
```

The entry features are `auth`, `account`, `onboarding`, `organization`, `error`
and `maintenance`. Organization owns its nested business features, including
collaboration. Root navigation belongs to the route configuration; it is not a
separate business feature. See the [system overview](docs/architecture/system-overview.md)
and each owner's `FEATURE.md` for boundaries and public APIs.

## Testing

Use Angular's `ng test` builder for application specs. Browser modes have distinct
boundaries: hermetic SPA, test harness, localized scenarios and real SSR smoke.
Start with the [testing guide](docs/guides/testing.md); [e2e/README.md](e2e/README.md)
contains the suite-specific procedures and limits.

## Documentation

Start at the [documentation index](docs/README.md).

| Reference                       | Owns                                                   |
| ------------------------------- | ------------------------------------------------------ |
| [Architecture](ARCHITECTURE.md) | Dependencies, ownership, public APIs, state and SSR    |
| [Design](DESIGN.md)             | Native Spartan composition and interaction conventions |
| [Product](PRODUCT.md)           | Product purpose, users and constraints                 |
| [Deployment](DEPLOYMENT.md)     | Image provenance, runtime configuration and Ansible    |
| [SonarQube](SONARQUBE.md)       | Branch-specific analysis and deployment readiness      |

## Deployment

The delivery chain is CI → validated image → GHCR → Ansible → health verification.
`main` targets production and `develop` targets development. Actual domains and
installation identities are recorded in the [installation appendix](docs/operations/current-installation.md).

## License

Proprietary. Distribution and use follow the project's licensing agreement.
