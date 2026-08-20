import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_EQUIPMENT_ID, equipmentOutput } from '../support/fixtures/equipment-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  E2E_INSPECTION_ID,
  draftInspectionOutput,
  inspectionOutput,
} from '../support/fixtures/inspection-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InspectionsPage } from '../support/pages/inspections.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard-fireguard-sso-web/f6620368-789f-4fb4-90d8-7b471cc33671/scratchpad/screenshots';

test.describe('Inspection list', () => {
  test('renders the status/result filter chip bar, pagination and New inspection', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInspectionList(E2E_ORGANIZATION_ID, [inspectionOutput()]);
    const inspections = new InspectionsPage(page);

    await inspections.gotoList(E2E_ORGANIZATION_ID);

    await expect(inspections.listRoot).toBeVisible();
    await expect(inspections.newLink).toBeVisible();
    await expect(inspections.rowCount).toBeVisible();
    await expect(inspections.pageIndicator).toHaveText('Page 1 of 1');

    await expect(inspections.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(inspections.filtersToggle.locator('hlm-badge')).toHaveCount(0);

    await inspections.openFilters();
    await expect(inspections.filtersToggle).toHaveAttribute('aria-expanded', 'true');

    await inspections.addFilter('Status');
    await expect(inspections.statusFilter).toBeVisible();
    await page.keyboard.press('Escape');

    await inspections.addFilter('Result');
    await expect(inspections.resultFilter).toBeVisible();
    await page.keyboard.press('Escape');
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
    await api.mockInspectionList(E2E_ORGANIZATION_ID, [inspectionOutput()]);
    const inspections = new InspectionsPage(page);

    await inspections.gotoList(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(inspections.listRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inspections-list-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInspectionList(E2E_ORGANIZATION_ID, [
      inspectionOutput(),
      draftInspectionOutput(),
    ]);
    const inspections = new InspectionsPage(page);

    await inspections.gotoList(E2E_ORGANIZATION_ID);
    await expect(inspections.listRoot).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inspections-list-light-desktop.png` });
  });
});

test.describe('Inspection create', () => {
  test('offers an equipment combobox, a result select, a performed-date picker and inspector fields', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput()]);
    const inspections = new InspectionsPage(page);

    await inspections.gotoCreate(E2E_ORGANIZATION_ID);

    await expect(inspections.createRoot).toBeVisible();
    await expect(inspections.createEquipmentCombobox).toBeVisible();
    await expect(inspections.createResultSelect).toBeVisible();
    await expect(page.locator('#inspection-create-performed-at')).toBeVisible();
    await expect(inspections.createInspectorName).toBeVisible();

    await inspections.submitEmptyCreateForm();
    await expect(page.getByText('Choose the inspected equipment.')).toBeVisible();
  });
});

test.describe('Inspection detail', () => {
  test('shows status/result tags with the non-conformity count, and a Submit/Cancel band on a draft', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInspectionDetail(E2E_ORGANIZATION_ID, draftInspectionOutput());
    const inspections = new InspectionsPage(page);

    await inspections.gotoDetail(E2E_ORGANIZATION_ID, 'e2e-inspection-2');

    await expect(inspections.detailRoot).toBeVisible();
    await expect(inspections.nonConformitiesCount).toBeVisible();

    // The header carries the status and result tags; the in-place result
    // field reuses the same component to show its current value, so a third
    // instance is expected once the record is a draft (editable in place).
    const statusTags = page.locator('app-inspection-status-tag');
    await expect(statusTags).toHaveCount(3);
    await Promise.all(
      [statusTags.nth(0), statusTags.nth(1)].map(async (tag) => {
        await expect(tag.locator('svg')).toBeVisible();
        await expect(tag).not.toHaveText('');
      }),
    );

    await expect(inspections.lifecycleBand).toBeVisible();
    await expect(inspections.submitAction).toBeVisible();
    await expect(inspections.cancelAction).toBeVisible();
    await expect(inspections.closeAction).toHaveCount(0);

    // Only a draft may be edited in place.
    const resultField = page.getByTestId('inspection-field-result');
    await expect(resultField.locator('button')).toBeEnabled();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/inspection-detail-light-desktop.png` });
  });

  test('shows a Close action on a submitted inspection and locks the in-place panel on a closed one', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInspectionDetail(
      E2E_ORGANIZATION_ID,
      inspectionOutput({ id: 'e2e-inspection-3', status: 'submitted' }),
    );
    const inspections = new InspectionsPage(page);

    await inspections.gotoDetail(E2E_ORGANIZATION_ID, 'e2e-inspection-3');
    await expect(inspections.closeAction).toBeVisible();
    await expect(inspections.submitAction).toHaveCount(0);
    await expect(inspections.cancelAction).toHaveCount(0);

    const resultField = page.getByTestId('inspection-field-result');
    await expect(resultField.locator('button')).toBeDisabled();
  });

  test('navigates from the equipment and facility links to their detail pages', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInspectionDetail(E2E_ORGANIZATION_ID, inspectionOutput());
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, equipmentOutput());
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
    const inspections = new InspectionsPage(page);

    await inspections.gotoDetail(E2E_ORGANIZATION_ID, E2E_INSPECTION_ID);

    await inspections.equipmentLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/equipments/${E2E_EQUIPMENT_ID}$`),
    );

    await inspections.gotoDetail(E2E_ORGANIZATION_ID, E2E_INSPECTION_ID);
    await inspections.facilityLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}$`),
    );
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
    await api.mockInspectionDetail(E2E_ORGANIZATION_ID, inspectionOutput());
    const inspections = new InspectionsPage(page);

    await inspections.gotoDetail(E2E_ORGANIZATION_ID, E2E_INSPECTION_ID);

    await expect(inspections.detailRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inspection-detail-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('paints the full-page skeleton immediately on a slow deep link, then swaps in the record', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    let releaseDetail!: () => void;
    const detailHold = new Promise<void>((resolve) => (releaseDetail = resolve));
    await api.mockInspectionDetail(E2E_ORGANIZATION_ID, inspectionOutput(), {
      holdUntil: detailHold,
    });
    const inspections = new InspectionsPage(page);

    await inspections.gotoDetail(E2E_ORGANIZATION_ID, E2E_INSPECTION_ID);

    await expect(inspections.detailLoading).toBeVisible();
    await expect(inspections.nonConformitiesCount).toHaveCount(0);

    releaseDetail();

    await expect(inspections.nonConformitiesCount).toBeVisible();
    await expect(inspections.detailLoading).toHaveCount(0);
  });
});
