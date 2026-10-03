import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  spatialBuildingModel,
  spatialFacilityModel,
  spatialGlb,
} from '../support/fixtures/facility-spatial-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

const SCREENSHOTS = 'tests/e2e/artifacts/facility-spatial-20261003';
const route = `/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}`;

/** Installs a two-floor model with a descendant equipment pin and an unplaced item. */
async function prepare(page: Page): Promise<ApiMock> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
  await api.mockFacilityPlans(E2E_FACILITY_ID, []);
  await api.mockFacilityBuildingModel(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, spatialBuildingModel());
  return api;
}

test('shows the building header 3D action with no building plan', async ({ page }) => {
  await prepare(page);
  await page.goto(route);
  const action = page.getByTestId('facility-detail-3d-link');
  await expect(action).toBeVisible();
  await expect(action).toHaveAttribute('href', `${route}/3d`);
  await action.click();
  await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
});

test('clears incompatible selections, isolates floors and keeps unplaced equipment accessible', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  await prepare(page);
  await page.goto(`${route}/3d`);
  const canvas = page.getByTestId('facility-3d-scene').locator('canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('option', { name: 'Storage' }).click();
  await expect(page.getByTestId('facility-3d-selection-announcement')).toContainText('Storage');
  await page
    .getByTestId('facility-3d-floor-selector-option')
    .filter({ hasText: 'Upper Floor' })
    .click();
  await expect(page.getByTestId('facility-3d-selection-announcement')).not.toContainText('Storage');
  await page.getByTestId('facility-3d-isolate-floor').click();
  await expect(page.getByTestId('facility-3d-show-all')).toBeVisible();
  await page.getByTestId('facility-3d-show-all').click();
  const ground = page
    .getByTestId('facility-3d-floor-selector-option')
    .filter({ hasText: 'Ground Floor' });
  await ground.focus();
  await page.keyboard.press('Enter');
  await expect(ground).toHaveAttribute('aria-current', 'true');
  await page
    .getByTestId('facility-3d-coordinate-mode')
    .getByRole('button', { name: 'Metric', exact: true })
    .click();
  await page.getByTestId('facility-3d-isolate-floor').click();
  const marker = page.getByTestId('facility-3d-equipment-marker').first();
  await expect(marker).toBeVisible();
  await marker.click();
  await expect(page.getByTestId('facility-3d-equipment-detail')).toContainText('SN-SPATIAL-1');
  await page.getByTestId('facility-3d-equipment-item').filter({ hasText: 'SN-SPATIAL-2' }).click();
  await expect(page.getByTestId('facility-3d-equipment-detail')).toContainText('Not placed');
  await expect(page.getByRole('link', { name: 'Open equipment' })).toHaveAttribute(
    'href',
    /equipments\/e2e-unplaced-equipment$/,
  );
  await page.getByTestId('facility-3d-explode-toggle').click();
  await page.getByTestId('facility-3d-reset-camera').click();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SCREENSHOTS}/generated-light-desktop.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('renders an authenticated GLB and switches to generated view without disposing its source', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  const api = await prepare(page);
  const model = spatialFacilityModel();
  await api.mockFacilityModels(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [model]);
  await api.mockFacilityModelDownload(model.id, spatialGlb());
  await page.goto(`${route}/3d`);
  const selector = page.getByTestId('facility-3d-model-mode');
  await expect(selector).toBeVisible();
  await selector.getByRole('button', { name: 'Imported model' }).click();
  await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/imported-light-desktop.png`, fullPage: true });
  const canvas = page.getByTestId('facility-3d-scene').locator('canvas');
  const frame = await canvas.boundingBox();
  if (!frame) throw new Error('The imported canvas needs a viewport.');
  await canvas.click({ position: { x: frame.width * 0.47, y: frame.height * 0.54 } });
  const management = page.getByTestId('facility-3d-model-management');
  await management.locator('summary').click();
  const object = management.getByRole('button', { name: /^#0/ });
  await expect(object).toHaveAttribute('aria-pressed', 'true');
  await object.focus();
  await page.keyboard.press('Escape');
  await expect(object).toHaveAttribute('aria-pressed', 'false');
  await management.locator('summary').click();
  await selector.getByRole('button', { name: 'Generated view' }).click();
  await page
    .getByTestId('facility-3d-coordinate-mode')
    .getByRole('button', { name: 'Metric', exact: true })
    .click();
  await selector.getByRole('button', { name: 'Imported model' }).click();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('allows importing into a building with no generated geometry and reports corrupt GLB distinctly', async ({
  page,
}) => {
  const api = await prepare(page);
  await api.mockFacilityBuildingModel(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {
    ...spatialBuildingModel(),
    floors: [],
  });
  const model = spatialFacilityModel();
  await api.mockFacilityModels(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [model]);
  await api.mockFacilityModelDownload(model.id, Buffer.from('corrupt'));
  await page.goto(`${route}/3d`);
  await page.getByTestId('facility-3d-model-management').locator('summary').click();
  await expect(page.getByTestId('facility-model-manager')).toContainText('valid autonomous GLB');
  await expect(page.getByTestId('facility-3d-unsupported')).toHaveCount(0);
  await api.mockFacilityModelDownload(model.id, spatialGlb());
  await page
    .getByTestId('facility-model-manager')
    .getByRole('button', { name: 'Retry', exact: true })
    .click();
  await page
    .getByTestId('facility-3d-model-mode')
    .getByRole('button', { name: 'Imported model' })
    .click();
  await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('facility-3d-empty')).toHaveCount(0);
});

test('fits the dark generated view after a portrait viewport resize', async ({
  page,
  context,
  baseURL,
}) => {
  const errors = collectConsoleErrors(page);
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await prepare(page);
  await page.goto(`${route}/3d`);
  await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('facility-3d-reset-camera').click();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SCREENSHOTS}/generated-dark-portrait.png`, fullPage: true });
  expect(errors).toEqual([]);
});
