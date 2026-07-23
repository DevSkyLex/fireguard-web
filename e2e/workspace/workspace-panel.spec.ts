import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The workspace right panel must never compete with a hosted page's own aside.
 *
 * `PANEL_SLOT` is mono-active and currently has no contributions, so the outlet
 * renders nothing and the intervention detail page keeps its single Properties
 * rail — exactly as it does in the dashboard shell.
 *
 * This becomes load-bearing in phase 4: the moment a panel contribution claims
 * the slot on this route, the page would show two side columns. That is the
 * signal to move the rail into the slot (which needs a root-provided bridge
 * store, mirroring `InterventionHeaderStore` — `InterventionWorkspaceStore` is
 * component-scoped and unreachable from a layout slot). This suite fails loudly
 * on that day instead of letting the regression ship.
 */
test.describe('Workspace panel', () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test('renders no panel while no contribution claims the slot', async ({ page }) => {
    const organization = organizationOutput();
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    await page.goto(`/organizations/${organization.id}/workspace`);
    await page.locator('#workspace-layout').waitFor({ state: 'visible' });

    const outlet = page.locator('app-workspace-layout-panel-outlet');

    await expect(outlet).toBeAttached();
    // The outlet element exists but must contribute no box of its own.
    await expect(outlet.locator('aside')).toHaveCount(0);
  });

  test('leaves the intervention page exactly one side column', async ({ page }) => {
    const organization = organizationOutput();
    const intervention = interventionOutput();

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkspace(intervention.id);

    await page.goto(`/organizations/${organization.id}/workspace/interventions/${intervention.id}`);
    await page.locator('#workspace-layout').waitFor({ state: 'visible' });

    const pageAsides = page.locator('#workspace-layout main aside');
    await expect(pageAsides).toHaveCount(1);

    const outletWidth = await page
      .locator('app-workspace-layout-panel-outlet')
      .evaluate((el: HTMLElement) => Math.round(el.getBoundingClientRect().width));

    expect(outletWidth).toBe(0);
  });
});
