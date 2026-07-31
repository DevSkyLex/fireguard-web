---
description: Write or run the hermetic Playwright e2e suite, reproduce a UI bug, or verify a visual/responsive/dark-mode change in a real browser.
argument-hint: '[spec path or area — e.g. e2e/organization or "dark mode on the account page"]'
---

Delegate to the **fg-e2e-runner** subagent: $ARGUMENTS

**First, make it justify the browser.** A browser is the tool of last resort. If `npx ng test`, `npm run lint`, or `npm run build` would prove the same thing, it must do that instead and say so.

When a browser genuinely is needed, require it to pick the right surface:

1. **The project's Playwright suite** — the default for anything repeatable. Hermetic: every call stubbed through `e2e/support/mocks/api-mock.ts`, running the SSR-off `e2e` build on **port 4273**. A spec that reaches a real backend hangs on the catch-all 404 net rather than failing cleanly.
2. **The Browser pane** (`preview_start(name: "fireguard-web")`, port 4200) — one-off inspection and visual proof. `read_page` for structure, `javascript_tool` with `getComputedStyle` for real colour values, `resize_window` for dark mode and mobile.
3. **The Playwright MCP** — when the question is which locator and wait will make a spec pass, since its snapshot model mirrors the API being written.

Rules it must honour:

- a finding worth keeping becomes a **spec**, not a one-off session,
- new endpoints get an `ApiMock` method and a fixture; new surfaces get an `id` or `data-testid` **added to the component** rather than a Tailwind-class locator,
- date-dependent fixtures are relative to now, at **local noon** — a midnight-UTC timestamp lands on the previous day in negative offsets,
- never trust a screenshot for exact colours or sizes,
- no `test.only` or `page.pause()` left behind; stop the dev server when done.
