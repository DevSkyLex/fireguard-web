---
name: fg-web-e2e
description: 'Reproduce or validate FireGuard UI behavior in a real browser: desktop/mobile rendering, themes, focus, navigation and offline flows.'
---

# fg-web-e2e

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read [the Playwright harness](references/playwright.md), `e2e/README.md` and
`playwright.config.ts` before changing tests. Prefer the project's hermetic Playwright suite;
use the Codex Browser pane or an available Playwright MCP for exploratory work when useful.
Keep real API calls out of the hermetic suite. Use existing ApiMock endpoint families,
fixtures, page objects and accessible locators.

Start with the narrowest affected scenarios in Chromium. Let Playwright manage port 4273;
reuse an existing compatible server instead of starting a duplicate. Wait for a dev rebuild
to settle before testing. Stop only processes started for this task.

A visual review requires opening and inspecting actual screenshots. For responsive changes,
cover affected desktop and mobile sizes, light/dark themes, long data and relevant open overlays.
Measure the concrete failure (overlap, offscreen action, focus, scroll position), then add a
regression assertion when it will catch that failure. Visibility assertions alone are not a
visual review. Use `animations: 'disabled'` for settled screenshots.

Keep captures outside the runner's disposable output folder; pass a distinct `--output` per
run. Do not broaden into unrelated workflows or repeat a complete matrix without a remaining
risk. Report browser, viewport/theme combinations, interactions, captures, passed tests and
limits. Unit tests or strict build handle logic/template errors that need no browser.
