# Local web development

Run the application against a configured API, or choose the isolated browser-test mode when testing UI contracts.

**Authoritative references:** [Package scripts](../../package.json) · [Angular configuration](../../angular.json) · [Deployment](../../DEPLOYMENT.md).

## Start a development server

```sh
npm ci
npm start
```

CI pins Node.js 22.23.3 and npm 11.16.0; use those versions to reproduce a lockfile
update. `npm run start:fr` and `npm run start:es` select localized
development servers. The standard server uses SSR; its server-side requests are
not intercepted by browser-only Playwright routing.

## Configuration boundaries

Angular file replacements provide development/build fallbacks. Hosted containers
read `APP_API_URL`, `APP_MERCURE_HUB_URL`, `APP_NAME` and `APP_MAINTENANCE` at startup.
The browser obtains the public runtime configuration through the existing bootstrap
contract. Configure endpoints for the same environment; do not copy a production
credential or a teammate's local environment into version control.

For illustrative URLs use `https://app.example.com`, `https://api.example.com`
and `https://mercure.example.com`. Actual deployment values belong to the
[installation appendix](../operations/current-installation.md).

## Daily feedback

Use focused Angular tests for changed logic, `npm run lint` for code/ownership,
`npm run format:check` for formatting and `npm run build` when compile/SSR boundaries
change. [Testing](testing.md) describes browser modes and acceptance scope.

## Dependency updates and evidence

Review dependency updates in a dedicated pull request at least monthly, and promptly
for a relevant advisory. Record the review date, installed Node/npm versions and
advisory status in the PR. Update `package.json` and `package-lock.json` together,
keep Angular packages on a compatible minor family, explain temporary overrides
and give each override a removal condition. Review the lockfile diff and upstream
release notes before running the ordinary quality and browser gates.

The blocking CI audit includes development/build dependencies. Its same-revision
`web-dependency-evidence` artifact contains the full audit, a production CycloneDX
SBOM and its production-component license inventory. `UNDECLARED` identifies missing
license metadata for review; the inventory records declarations without deciding
license compatibility. Keep evidence with the tested revision and repeat it after
changing a lockfile or tool pin. Update the exact Node/npm pins in the shared Node
preparation action and workflow together, after checking Angular's engine ranges.
