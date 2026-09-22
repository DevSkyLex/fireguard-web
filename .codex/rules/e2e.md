# Browser verification

Read `e2e/README.md`, the selected Playwright config and
[validation selection](../references/validation.md). Choose the boundary before a command:
SPA on 4273, synthetic harness without Angular, real SSR smoke, or localized browser cases.
The normal config excludes harness/SSR/localized folders; one green suite does not cover them all.

- SPA API calls use `e2e/support/mocks/api-mock.ts`. The safety net returns 404 and records a
  Playwright assertion for unknown API requests, even when the UI catches the response.
  Diagnose the unmocked method/path/organization instead of treating it as a product defect.
- Endpoint mock methods install the safety net and match intended query/method contracts.
  Do not introduce real backend/account calls.
- Page objects live at `e2e/support/pages/<name>.page.ts`, with named locators and one method
  per user intent. `.page.ts` is reserved for these outside `src/app`.
- Locate by role, stable `id` or `data-testid`, never a Tailwind class. Add a production hook
  only when it exposes an appropriate stable UI boundary.
- Use meaningful full-sentence scenario names. Keep date-dependent fixtures relative to now
  at local noon. Assert settled state rather than fixed waits; no committed `test.only`, `it.only` or `page.pause()`.
- Mobile device projects prove touch/platform behavior; a narrow desktop viewport proves reflow.
  Inspect actual screenshots for visual review, including affected themes and open overlays.
- Keep captures outside disposable output, use a distinct output directory/run identifier and
  stop only owned processes. Do not run conflicting servers on port 4274 simultaneously.

Use `fg-web-e2e` for execution. Unit tests cover owned logic; browser tests cover interaction,
focus, responsive behavior, navigation, offline behavior and visual evidence that need a browser.
