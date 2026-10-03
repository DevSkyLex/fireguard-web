import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../support/fixtures/facility-fixtures';
import { spatialLegacyBuildingModel } from '../support/fixtures/facility-spatial-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';

test('keeps legacy floor diagnostics and their correction link accessible in the dark touch sheet', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  const model = spatialLegacyBuildingModel();
  await api.mockFacilityBuildingModel(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, model);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/3d`);
  await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Metric', exact: true }).tap();
  await page.getByTestId('facility-3d-open-room-panel').tap();
  const sheet = page.getByTestId('facility-3d-room-panel');
  await expect(sheet).toBeVisible();
  const legacyFloor = sheet
    .getByTestId('facility-3d-floor-selector-option')
    .filter({ hasText: 'Ground Floor' });
  await expect(legacyFloor).toContainText('Hierarchy needs correction');
  await expect(legacyFloor).not.toContainText('Incomplete');
  const warning = sheet.getByTestId('facility-3d-hierarchy-issues');
  await expect(warning).toContainText('parent type is incompatible');
  await expect(warning.getByRole('link', { name: 'Ground Floor', exact: true })).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/${model.floors[0].facilityId}`,
  );
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `tests/e2e/artifacts/facility-coherence-20261003/${testInfo.project.name}/legacy-floor-touch-dark.png`,
    animations: 'disabled',
    fullPage: true,
  });
  await sheet.getByTestId('facility-3d-room-panel-dismiss').tap();
  await expect(sheet).toHaveCount(0);
  await page.getByTestId('facility-3d-isolate-floor').tap();
  await expect(page.getByTestId('facility-3d-equipment-marker')).toBeVisible();
  expect(errors).toEqual([]);
});
