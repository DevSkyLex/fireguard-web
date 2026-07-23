import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

/**
 * Workspace rail — organization tiles and the seat menu.
 *
 * The rail is assembled from two independent slot contributions that know
 * nothing of each other: `withOrganizationRail()` (lead region) and
 * `withAccountRailMenu()` (footer). This suite covers the composition, the
 * active-organization marking, and the 60px column's size constraint — the
 * dashboard's `AccountUserMenu` measures ~215px and would silently overflow it.
 */
test.describe('Workspace rail', () => {
  const organizations = [
    organizationOutput(),
    organizationOutput({
      '@id': '/api/organizations/e2e-org-2',
      id: 'e2e-org-2',
      name: 'Nord Industries',
      slug: 'nord-industries',
    }),
  ];

  test('renders one tile per organization and marks the open one', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizations[0].id);

    const tiles = workspace.rail.getByRole('button', { name: /Organization|Industries/ });
    await expect(tiles).toHaveCount(2);

    // Selection is announced, not just coloured — the tile also carries a ring,
    // but colour alone never conveys state (PRODUCT.md).
    await expect(
      workspace.rail.getByRole('button', { name: organizations[0].name }),
    ).toHaveAttribute('aria-current', 'true');
    await expect(
      workspace.rail.getByRole('button', { name: organizations[1].name }),
    ).not.toHaveAttribute('aria-current', 'true');
  });

  test('keeps every rail control inside the 60px column', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizations[0].id);

    const widths = await workspace.rail.evaluate((rail: HTMLElement) =>
      Array.from(rail.querySelectorAll('button')).map((b: HTMLButtonElement) =>
        Math.round(b.getBoundingClientRect().width),
      ),
    );

    expect(widths.length).toBeGreaterThan(0);
    widths.forEach((width: number) => expect(width).toBeLessThanOrEqual(60));
  });

  test('offers organization creation from the rail', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizations[0].id);

    await workspace.rail.getByRole('button', { name: 'Add organization' }).click();

    // Creation lives in onboarding, not under /organizations — the same
    // destination the organization switcher uses. The final URL is not asserted
    // because `onboardingGuard` bounces a member who already completed
    // onboarding back to their organization; what matters here is that the rail
    // leaves the workspace rather than doing nothing.
    await expect(page).not.toHaveURL(/\/workspace/);
  });

  test('opens the account menu from the seat avatar', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizations[0].id);

    const trigger = page.getByTestId('account-rail-menu-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    await expect(page.getByTestId('account-rail-menu-profile')).toBeVisible();
    await expect(page.getByTestId('account-rail-menu-logout')).toBeVisible();
    // The disclosure state used to be hard-coded `false`, so the menu
    // announced as collapsed however many times it had been opened.
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // PrimeNG moves focus into the overlay only for an `[autofocus]` element.
    await expect(page.getByTestId('account-rail-menu-profile')).toBeFocused();

    // …and dismissing it has to hand focus back, or the next Tab restarts from
    // the top of the document.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('account-rail-menu-profile')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
