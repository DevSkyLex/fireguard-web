import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { equipmentOutput } from '../support/fixtures/equipment-fixtures';
import {
  E2E_FACILITY_ID,
  facilityChildOutput,
  facilityOutput,
} from '../support/fixtures/facility-fixtures';
import { inspectionOutput } from '../support/fixtures/inspection-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { AssetsExplorerPage } from '../support/pages/assets-explorer.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/a0fca115-3de1-47c3-8f29-ea668e28ae22/scratchpad/screenshots';

test.describe('Assets explorer', () => {
  test('renders the site tree roots on the "By site" axis', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput({ hasChildren: true })]);
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);

    await expect(explorer.root).toBeVisible();
    await expect(explorer.siteTab).toBeVisible();
    await expect(explorer.treeItems).toHaveCount(1);
  });

  test('expands a node and loads its children', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput({ hasChildren: true })]);
    await api.mockFacilityChildren(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [facilityChildOutput()]);
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.treeToggle.first().click();

    await expect(explorer.treeItems).toHaveCount(2);
  });

  test('selecting a site loads its equipment into the right pane', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const facility = facilityOutput();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facility]);
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, facility.id, {
      equipment: [equipmentOutput()],
      inspections: [inspectionOutput()],
    });
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.selectSite(facility.name);

    await expect(explorer.equipmentPane).toBeVisible();
    await expect(explorer.equipmentRows).toHaveCount(1);
    await expect(explorer.inspectionsPane).toBeVisible();
    await expect(explorer.inspectionsRows).toHaveCount(1);
  });

  test('the "Everything" axis shows the unscoped equipment and inspection lists', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput()]);
    await api.mockInspectionList(E2E_ORGANIZATION_ID, [inspectionOutput()]);
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.everythingTab.click();

    await expect(explorer.equipmentRows).toHaveCount(1);
    await expect(explorer.inspectionsRows).toHaveCount(1);
  });

  test('renders at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(explorer.root).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/assets-explorer-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});
