# Playwright e2e

`ARCHITECTURE.md` **§14.1** (when to reach for e2e), **§9.9** / **§9.10** (naming and hooks). `e2e/README.md` documents the mock-composition rules — read it before adding a spec.

## Run it

```powershell
npm run e2e:chromium     # fastest feedback — start here
npm run e2e:test         # full matrix: chromium, firefox, webkit
npm run e2e:headed       # watch it run
npm run e2e:ui           # interactive debugging
npm run e2e:debug        # step through
npm run e2e:report       # open the last HTML report
npm run e2e:install      # install browsers (once)
```

`playwright.config.ts` starts `ng serve --configuration=e2e` on **port 4273** itself (`E2E_PORT`, line 11). That build is **SSR-off** deliberately — hydration timing makes assertions flaky. Do not point the suite at the dev server on 4200.

## Hermetic by construction

Every backend call is stubbed through `e2e/support/mocks/api-mock.ts`. No API, no database, no Mercure. A spec that reaches a real backend **hangs on the catch-all 404 net** rather than failing cleanly — that symptom means you forgot to register an endpoint.

`ApiMock` composes:

- `installSafetyNet()` — the catch-all that turns an unmocked call into a visible 404,
- `mockUnauthenticatedSession()` / `mockAuthenticatedSession()` / `mockSessionData()`,
- one method per endpoint family, each fulfilling from a fixture.

Adding an endpoint:

```ts
public async mockInterventionList(
  interventions: ReadonlyArray<InterventionOutputFixture> = [interventionOutput()],
): Promise<void> {
  await this.installSafetyNet();
  await this.page.route(/\/api\/interventions(\?.*)?$/, async (route) => {
    await fulfillJson(route, 200, hydraCollection(interventions));
  });
}
```

Match with a **regex tolerant of query strings** (`(\?.*)?$`) — several stores hit the same path with different params, and one matcher should serve them all. Fixtures live in `e2e/support/fixtures/`.

## Page objects

`e2e/support/pages/<name>.page.ts` exporting `class <Name>Page` (§9.9). Named locators plus **one method per user intent** — not one per click:

```ts
export class InterventionsPage {
  public constructor(private readonly page: Page) {}

  public readonly root = this.page.locator('#interventions');
  public readonly board = this.page.getByTestId('board');

  public async goto(organizationId: string): Promise<void> { … }
  public async selectView(name: string): Promise<void> { … }
  public cardsIn(columnId: string): Locator { … }
}
```

`.page.ts` is **reserved** for these (§9.2) — never used inside `src/app`.

## The hooks specs locate by (§9.10)

- page and section roots carry a kebab-case DOM **`id`**: `#login-page`, `#organization-overview` — the primary scoping hook,
- **`data-testid`** is kebab-case and prefixed by the owning component: `board-card`, `account-mfa-confirm-code`,
- prefer accessible locators where the ARIA is the contract: `getByRole('tab', { name: 'Interventions view' })`, `getByLabel('Calendar view')`. A test that breaks when a label changes is telling you the label is user-facing.

If a surface has no hook, **add one to the component** in the same change — do not locate by CSS class, which Tailwind churns constantly.

## Spec conventions (§9.9)

`e2e/<area>/<scenario>.spec.ts`, kebab-case scenario names. `test.describe()` takes a human-readable feature name; test titles are **full sentences**:

```ts
test('signs in and lands on the default organization workspace', async ({ page }) => { … });
```

## Time-dependent fixtures

Anything the UI filters by date must be dated relative to _now_, or the spec passes today and fails next month:

```ts
const now = new Date();
const plannedStartAt = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  12,
  0,
  0,
).toISOString();
```

Local noon, not midnight UTC — a midnight-UTC timestamp lands on the previous day in negative offsets, and a component that renders only non-empty days will show nothing at all.

## When e2e is the right tool

Use it for what a unit spec **cannot** prove: visual and responsive rendering, dark mode, offline behaviour, multi-page flows, drag-and-drop, real routing. §14.1 is explicit that unit specs cover the boundaries; e2e covers the browser.

Do **not** reach for a browser to check logic `npx ng test` covers, template errors `npm run build` catches, or style-rule violations `npm run lint` catches.

## Errors that cost time

- Leaving `test.only` or `page.pause()` in a committed spec.
- Locating by Tailwind class instead of `id` / `data-testid` / role.
- Asserting on a spinner instead of the settled state — prefer `expect(locator).toBeVisible()` over `waitForTimeout`.
- Forgetting `installSafetyNet()`, so an unmocked call silently hits the network.
- Fixtures with `null` dates against a component that renders only non-empty days.
