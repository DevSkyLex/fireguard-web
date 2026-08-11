import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { equipmentOutput, inStockEquipmentOutput } from '../support/fixtures/equipment-fixtures';
import {
  E2E_FACILITY_CHILD_ID,
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
import { FacilitiesPage } from '../support/pages/facilities.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard-fireguard-sso-web/f6620368-789f-4fb4-90d8-7b471cc33671/scratchpad/screenshots';

test.describe('Facility list', () => {
  test('renders search, the archived filter, the list/grid toggle, a row menu and New facility', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoList(E2E_ORGANIZATION_ID);

    await expect(facilities.listRoot).toBeVisible();
    await expect(facilities.search).toBeVisible();
    await expect(facilities.newLink).toBeVisible();

    await facilities.filtersTrigger.click();
    await expect(facilities.archivedCheckbox).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(facilities.listViewToggle).toBeVisible();
    await expect(facilities.gridViewToggle).toBeVisible();
    await facilities.gridViewToggle.click();
    await expect(page.getByTestId('facility-grid')).toBeVisible();
    await facilities.listViewToggle.click();

    await facilities.rowMenu.first().click();
    await expect(page.getByTestId('facility-table-row-archive')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('round-trips the ?page= query param', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()], { totalItems: 45 });
    const facilities = new FacilitiesPage(page);

    await facilities.gotoList(E2E_ORGANIZATION_ID);
    await expect(facilities.pageIndicator).toHaveText('Page 1 of 2');

    await facilities.pageNext.click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(facilities.pageIndicator).toHaveText('Page 2 of 2');

    await page.reload();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(facilities.pageIndicator).toHaveText('Page 2 of 2');
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
    const facilities = new FacilitiesPage(page);

    await facilities.gotoList(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(facilities.listRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/facilities-list-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoList(E2E_ORGANIZATION_ID);
    await expect(facilities.listRoot).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/facilities-list-light-desktop.png` });
  });
});

test.describe('Facility create', () => {
  test('requires Type and Name, offers a Parent combobox, and validates lat/long together', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoCreate(E2E_ORGANIZATION_ID);
    await expect(facilities.createRoot).toBeVisible();
    await expect(page.locator('#facility-create-parent')).toBeVisible();

    await facilities.submitEmptyCreateForm();
    await expect(page.getByText('Facility type is required.')).toBeVisible();
    await expect(page.getByText('Name is required.')).toBeVisible();

    await facilities.createName.fill('South Wing');
    await facilities.createLatitude.fill('48.85');
    await facilities.submitEmptyCreateForm();
    await expect(
      page.getByText('Enter both latitude and longitude, or leave both empty.').first(),
    ).toBeVisible();
  });
});

test.describe('Facility detail', () => {
  test('renders the Overview hierarchy chart and navigates on node click', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput({ hasChildren: true }));
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityChildOutput());
    await api.mockFacilityDescendants(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
      facilityChildOutput(),
    ]);
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {
      equipment: [equipmentOutput(), inStockEquipmentOutput()],
      inspections: [inspectionOutput()],
    });
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_CHILD_ID, {});
    const facilities = new FacilitiesPage(page);

    await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);

    await expect(facilities.detailRoot).toBeVisible();
    await expect(facilities.hierarchyNodes).toHaveCount(2);
    await expect(page.getByText('Equipment status')).toBeVisible();
    await expect(page.getByText('Recent inspections')).toBeVisible();

    await facilities.hierarchyNodes.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/facilities/${E2E_FACILITY_CHILD_ID}$`));
    await expect(page.getByRole('heading', { name: 'Ground Floor' })).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/facility-detail-light-desktop.png` });
  });

  test('renders read-only Type/Parent rows and an in-place editable Name on the Information tab', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
    const facilities = new FacilitiesPage(page);

    await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);
    await facilities.informationTab.click();

    await expect(facilities.typeField).toBeVisible();
    await expect(facilities.parentField).toBeVisible();
    await expect(facilities.nameField).toBeVisible();

    await facilities.nameField.click();
    await expect(facilities.nameField.locator('input')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('redirects /:facilityId/edit onto the record', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
    const facilities = new FacilitiesPage(page);

    await facilities.gotoEdit(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);

    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}$`),
    );
    await expect(facilities.detailRoot).toBeVisible();
  });

  test('renders in dark mode at 375px with no console errors', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
    const facilities = new FacilitiesPage(page);

    await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);

    await expect(facilities.detailRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/facility-detail-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders the four equipment-status bars in distinct colours in dark mode', async ({
    page,
    context,
    baseURL,
  }) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {
      equipment: [
        equipmentOutput({ id: 'e2e-eq-operational', status: 'operational' }),
        equipmentOutput({ id: 'e2e-eq-in-stock', status: 'in_stock' }),
        equipmentOutput({ id: 'e2e-eq-maintenance', status: 'under_maintenance' }),
        equipmentOutput({ id: 'e2e-eq-decommissioned', status: 'decommissioned' }),
      ],
    });
    const facilities = new FacilitiesPage(page);

    await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const bars = page.getByTestId('facility-equipment-status-bar');
    await expect(bars).toHaveCount(4);

    const swatches = await bars.evaluateAll((elements) =>
      elements.map((element) => ({
        fill: getComputedStyle(element).backgroundColor,
        track: getComputedStyle(element.parentElement as HTMLElement).backgroundColor,
      })),
    );

    expect(new Set(swatches.map((swatch) => swatch.fill)).size, 'all four bars distinct').toBe(4);
    for (const swatch of swatches) {
      expect(swatch.fill, 'bar colour distinct from its bg-muted track').not.toBe(swatch.track);
    }
  });

  test('paints the full-page skeleton immediately on a slow deep link, then swaps in the record', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    let releaseDetail!: () => void;
    const detailHold = new Promise<void>((resolve) => (releaseDetail = resolve));
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput(), {
      holdUntil: detailHold,
    });
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
    const facilities = new FacilitiesPage(page);

    await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);

    await expect(facilities.detailLoading).toBeVisible();
    await expect(facilities.overviewTab).toHaveCount(0);

    releaseDetail();

    await expect(facilities.overviewTab).toBeVisible();
    await expect(facilities.detailLoading).toHaveCount(0);
  });
});
