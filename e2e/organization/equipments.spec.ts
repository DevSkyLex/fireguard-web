import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_EQUIPMENT_ID,
  equipmentOutput,
  inStockEquipmentOutput,
} from '../support/fixtures/equipment-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { EquipmentsPage } from '../support/pages/equipments.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard-fireguard-sso-web/f6620368-789f-4fb4-90d8-7b471cc33671/scratchpad/screenshots';

test.describe('Equipment list', () => {
  test('renders search, the type/status filter chip bar, pagination and a permission-gated New equipment link', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput(), inStockEquipmentOutput()]);
    const equipments = new EquipmentsPage(page);

    await equipments.gotoList(E2E_ORGANIZATION_ID);

    await expect(equipments.listRoot).toBeVisible();
    await expect(equipments.search).toBeVisible();
    await expect(equipments.newLink).toBeVisible();
    await expect(equipments.rowCount).toHaveText('2 of 2 row(s) shown');
    await expect(equipments.pageIndicator).toHaveText('Page 1 of 1');

    await expect(equipments.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(equipments.filtersToggle.locator('hlm-badge')).toHaveCount(0);

    await equipments.openFilters();
    await expect(equipments.filtersToggle).toHaveAttribute('aria-expanded', 'true');

    await equipments.addFilter('Type');
    await expect(equipments.typeFilter).toBeVisible();
    await expect(equipments.filterOptions).toHaveCount(1);
    await equipments.closeFilterOptions();
    await expect(equipments.filterOptions).toHaveCount(0);

    await equipments.addFilter('Status');
    await expect(equipments.statusFilter).toBeVisible();
    await expect(equipments.filterOptions).toHaveCount(1);
    const statusOption = equipments.filterOptions.getByRole('option').first();
    await expect(statusOption.locator('svg')).toBeVisible();
    await expect(statusOption).not.toHaveText('');
    await equipments.closeFilterOptions();
  });

  test('shows the empty state when no equipment matches, and hides New equipment without write permission', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ['organization.equipment.read'],
    });
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
    const equipments = new EquipmentsPage(page);

    await equipments.gotoList(E2E_ORGANIZATION_ID);

    await expect(page.getByText('No equipment found')).toBeVisible();
    await expect(equipments.newLink).toHaveCount(0);
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
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput()]);
    await api.mockEquipmentKpis(E2E_ORGANIZATION_ID);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    const equipments = new EquipmentsPage(page);

    await equipments.gotoList(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(equipments.listRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/equipments-list-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput(), inStockEquipmentOutput()]);
    const equipments = new EquipmentsPage(page);

    await equipments.gotoList(E2E_ORGANIZATION_ID);

    await expect(equipments.listRoot).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/equipments-list-light-desktop.png` });
  });
});

test.describe('Equipment create', () => {
  test('shows a required-type validation message on empty submit', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const equipments = new EquipmentsPage(page);

    await equipments.gotoCreate(E2E_ORGANIZATION_ID);
    await expect(equipments.createRoot).toBeVisible();

    await equipments.submitEmptyCreateForm();

    await expect(page.getByText('Equipment type is required.')).toBeVisible();
  });
});

test.describe('Equipment detail', () => {
  test('renders the status band with icon+label tags and the editable information panel', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, equipmentOutput());
    const equipments = new EquipmentsPage(page);

    await equipments.gotoDetail(E2E_ORGANIZATION_ID, E2E_EQUIPMENT_ID);

    await expect(equipments.detailRoot).toBeVisible();
    await expect(equipments.lifecycleBand).toBeVisible();
    await expect(equipments.primaryAction).toHaveText(/Maintenance/i);
    await expect(equipments.decommissionAction).toBeVisible();

    // Both status badges carry an icon alongside the label — never colour alone.
    const statusTags = page.locator('app-equipment-status-tag');
    await expect(statusTags).toHaveCount(2);
    await Promise.all(
      (await statusTags.all()).map(async (tag) => {
        await expect(tag.locator('svg')).toBeVisible();
        await expect(tag).not.toHaveText('');
      }),
    );

    await expect(equipments.brandField).toBeVisible();
    await equipments.brandField.click();
    await expect(equipments.brandField.locator('input')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/equipment-detail-light-desktop.png` });
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
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, inStockEquipmentOutput());
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    const equipments = new EquipmentsPage(page);

    await equipments.gotoDetail(E2E_ORGANIZATION_ID, 'e2e-equipment-2');

    await expect(equipments.detailRoot).toBeVisible();
    await expect(equipments.primaryAction).toHaveText(/Commission/i);
    await expect(page.getByText('Unassigned')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/equipment-detail-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('paints the full-page skeleton immediately on a slow deep link, then swaps in the record', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    let releaseDetail!: () => void;
    const detailHold = new Promise<void>((resolve) => (releaseDetail = resolve));
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, equipmentOutput(), {
      holdUntil: detailHold,
    });
    const equipments = new EquipmentsPage(page);

    await equipments.gotoDetail(E2E_ORGANIZATION_ID, E2E_EQUIPMENT_ID);

    await expect(equipments.detailLoading).toBeVisible();
    await expect(equipments.lifecycleBand).toHaveCount(0);

    releaseDetail();

    await expect(equipments.lifecycleBand).toBeVisible();
    await expect(equipments.detailLoading).toHaveCount(0);
  });
});
