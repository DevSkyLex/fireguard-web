---
paths:
  - 'e2e/**/*.ts'
---

# Playwright e2e

- The suite is **hermetic**: every backend call is stubbed through `e2e/support/mocks/api-mock.ts`. A spec that reaches a real backend **hangs on the catch-all 404 net** rather than failing cleanly — that symptom means an endpoint is unmocked, not that the app is broken.
- Call `installSafetyNet()` in every `ApiMock` method; match routes with a regex tolerant of query strings — `/\/api\/interventions(\?.*)?$/` — so one matcher serves several stores.
- `playwright.config.ts` starts the **SSR-off `e2e` build on port 4273** itself (`E2E_PORT`, line 11). Do not point the suite at the dev server on 4200; hydration timing makes assertions flaky.
- Page objects: `e2e/support/pages/<name>.page.ts` exporting `class <Name>Page`, with named locators and **one method per user intent** — not one per click. `.page.ts` is reserved for these and never used inside `src/app` (§9.2, §9.9).
- **Locate by `id`, `data-testid`, or role** — never by a Tailwind class, which churns constantly. If a surface has no hook, add one **to the component** in the same change (§9.10).
- Test titles are full sentences: `test('signs in and lands on the default organization workspace', …)`.
- **Date-dependent fixtures are relative to now, at local noon.** A midnight-UTC timestamp lands on the previous day in negative offsets, and a component that renders only non-empty days shows nothing at all.
- Prefer `expect(locator).toBeVisible()` over `waitForTimeout`; assert the settled state, not a spinner.
- No `test.only` or `page.pause()` in a committed spec.

Reach for e2e only for what a unit spec **cannot** prove — visual, responsive, dark mode, offline, multi-page, drag-and-drop.
