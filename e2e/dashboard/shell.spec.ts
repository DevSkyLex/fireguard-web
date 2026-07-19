import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The collaboration shell — rail · sidebar · main · panel stack.
 *
 * Unit specs can assert the shell's composition but not its *geometry*: widths
 * come from inline styles resolved against a real viewport, and horizontal
 * overflow only exists once the flex chain is laid out. This suite is the
 * P-OVERFLOW / geometry probe the refonte plan calls for.
 *
 * Widths are ported from the design system's collaboration kit
 * (`ui_kits/fireguard-workspace/workspace.css`), so a drift here means either
 * the constants or the kit moved — not that the test is brittle.
 */
const RAIL_WIDTH = 60;
const SIDEBAR_WIDTH = 266;

async function landOnWorkspace(page: Page): Promise<string> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  await page.goto(`/organizations/${organization.id}`);
  await expect(page.locator('#dashboard-layout')).toBeVisible();

  return organization.id;
}

/** True when the document scrolls sideways — the shell's cardinal sin. */
async function overflowsHorizontally(page: Page): Promise<boolean> {
  return page.evaluate(
    (): boolean => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

test.describe('Dashboard shell', () => {
  test('renders the rail and sidebar at their ported widths on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnWorkspace(page);

    const rail = page.locator('app-dashboard-layout-org-rail');
    const sidebar = page.locator('app-dashboard-layout-sidebar');

    await expect(rail).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(page.locator('app-dashboard-layout-header')).toBeVisible();
    await expect(page.locator('app-dashboard-layout-content')).toBeVisible();

    expect((await rail.boundingBox())?.width).toBe(RAIL_WIDTH);
    expect((await sidebar.boundingBox())?.width).toBe(SIDEBAR_WIDTH);
  });

  // One case per width rather than a loop: a failure names the breakpoint that
  // broke, and each run starts from a clean context.
  for (const width of [1920, 1536, 1280, 1024, 768, 375]) {
    test(`never scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await landOnWorkspace(page);

      expect(await overflowsHorizontally(page)).toBe(false);
    });
  }

  // The toggle used to be hidden by a `lg:hidden` class (1024px) while the
  // shell switched to the drawer at 768px, leaving a useless button in the
  // 256px band between them. The shell now owns the decision outright.
  test('offers the navigation toggle only while the nav is in the drawer', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await landOnWorkspace(page);
    const toggle = page.getByRole('button', { name: 'Open navigation menu' });

    await expect(toggle).toHaveCount(0);

    await page.setViewportSize({ width: 600, height: 800 });

    await expect(toggle).toBeVisible();
  });

  test('moves the rail and sidebar into the drawer on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await landOnWorkspace(page);

    // Nothing inline below the tablet breakpoint.
    await expect(page.locator('app-dashboard-layout-org-rail')).toHaveCount(0);
    await expect(page.locator('app-dashboard-layout-sidebar')).toHaveCount(0);

    // The hamburger brings both back, inside the drawer.
    await page.getByRole('button', { name: 'Open navigation menu' }).first().click();

    await expect(page.locator('app-dashboard-layout-org-rail')).toBeVisible();
    await expect(page.locator('app-dashboard-layout-sidebar')).toBeVisible();
  });

  test('keeps the page scroller independent of the shell', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnWorkspace(page);

    // Exactly one vertical scroller in the content plane; the shell itself and
    // the document must not scroll.
    const documentScrolls = await page.evaluate(
      (): boolean => document.documentElement.scrollHeight > document.documentElement.clientHeight,
    );

    expect(documentScrolls).toBe(false);
  });
});
