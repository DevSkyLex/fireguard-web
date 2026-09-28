# Local web development

Run the application against a configured API, or choose the isolated browser-test mode when testing UI contracts.

**Authoritative references:** [Package scripts](../../package.json) · [Angular configuration](../../angular.json) · [Deployment](../../DEPLOYMENT.md).

## Start a development server

```sh
npm ci
npm start
```

Use Node.js 22, as in CI. `npm run start:fr` and `npm run start:es` select localized
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
