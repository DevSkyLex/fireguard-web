import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  complianceFacilityTreeOutput,
  complianceSummaryOutput,
} from '../support/fixtures/compliance-fixtures';
import { equipmentOutput } from '../support/fixtures/equipment-fixtures';
import {
  E2E_FACILITY_ID,
  facilityChildOutput,
  facilityOutput,
  facilitySiblingOutput,
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

  test('offers the facility and equipment creation entry points the sidebar no longer carries', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);

    await expect(explorer.newFacility).toBeVisible();
    await expect(explorer.newEquipment).toBeVisible();

    await explorer.newFacility.click();
    await expect(page).toHaveURL(new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/facilities`));
    await expect(page.getByTestId('facility-create-sheet')).toBeVisible();
  });

  /*
   * The explorer replaced two routed list pages that both wrote their state to
   * the URL, and inherited neither — a reload came back on "By site" with
   * nothing selected, and "the equipment of this site" could not be shared.
   */
  test('puts the selected site in the URL and carries it into creation', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.treeItems.first().click();

    await expect(page).toHaveURL(new RegExp(`[?&]facility=${E2E_FACILITY_ID}`));

    // The href is the contract: the operator lands on the list with the sheet open, already scoped.
    await expect(explorer.newEquipment).toHaveAttribute(
      'href',
      `/organizations/${E2E_ORGANIZATION_ID}/equipments?create=1&facility=${E2E_FACILITY_ID}`,
    );
    await expect(explorer.newFacility).toHaveAttribute(
      'href',
      `/organizations/${E2E_ORGANIZATION_ID}/facilities?create=1&parent=${E2E_FACILITY_ID}`,
    );
  });

  test('restores the compliance axis from the URL on reload', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.complianceTab.click();
    await expect(page).toHaveURL(/[?&]axis=compliance/);

    await page.reload();
    await expect(explorer.complianceTab).toHaveAttribute('data-state', 'active');
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

  test('drags a site onto another to re-parent it', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const siteA = facilityOutput();
    const siteB = facilitySiblingOutput();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [siteA, siteB]);
    await api.mockFacilityMove(E2E_ORGANIZATION_ID, siteA.id, {
      ...siteA,
      parentFacilityId: siteB.id,
    });
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await expect(explorer.treeItems).toHaveCount(2);

    const moveRequest = page.waitForRequest(
      (request) =>
        request.url().includes(`/facilities/${siteA.id}/move`) && request.method() === 'POST',
    );
    await explorer.dragNodeOnto(siteA.id, siteB.id);
    await moveRequest;

    await expect(explorer.treeItems).toHaveCount(1);
    await expect(explorer.treeItems).toContainText(siteB.name);
  });

  test('does not move a site dropped onto its own already-loaded child', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const parent = facilityOutput({ hasChildren: true });
    const child = facilityChildOutput();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [parent]);
    await api.mockFacilityChildren(E2E_ORGANIZATION_ID, parent.id, [child]);
    const explorer = new AssetsExplorerPage(page);

    let moveRequested = false;
    page.on('request', (request) => {
      if (request.url().includes('/move')) moveRequested = true;
    });

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.treeToggle.first().click();
    await expect(explorer.treeItems).toHaveCount(2);

    await explorer.dragNodeOnto(parent.id, child.id);

    await expect(explorer.treeItems).toHaveCount(2);
    expect(moveRequested).toBe(false);
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

  test('the "Compliance" axis renders the tree with a compliance badge on each node', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    await api.mockComplianceFacilityTree(E2E_ORGANIZATION_ID, complianceFacilityTreeOutput());
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.openComplianceAxis();

    await expect(explorer.complianceTreePanel).toBeVisible();
    await expect(explorer.complianceTreeItems).toHaveCount(1);
    await expect(explorer.complianceBadges).toHaveCount(1);
    await expect(explorer.complianceBadges.first()).toContainText('92%');
  });

  test('selecting a compliance node shows the facility summary and an export control', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    await api.mockComplianceFacilityTree(E2E_ORGANIZATION_ID, complianceFacilityTreeOutput());
    await api.mockFacilityCompliance(
      E2E_ORGANIZATION_ID,
      E2E_FACILITY_ID,
      complianceSummaryOutput(),
    );
    const explorer = new AssetsExplorerPage(page);

    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.openComplianceAxis();
    await explorer.selectComplianceSite('North Building');

    await expect(explorer.complianceSummaryBadge).toBeVisible();
    await expect(explorer.complianceExportButton).toBeVisible();
    await expect(explorer.complianceExportButton).toBeEnabled();
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
