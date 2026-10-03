import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../support/fixtures/facility-fixtures';
import { spatialBuildingModel } from '../support/fixtures/facility-spatial-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';

for (const theme of ['light', 'dark'] as const) {
  test(`renders a touch-accessible 3D floor and equipment sheet in ${theme} mode`, async ({
    page,
    context,
    baseURL,
    browserName,
  }) => {
    const errors = collectConsoleErrors(page);
    await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityBuildingModel(
      E2E_ORGANIZATION_ID,
      E2E_FACILITY_ID,
      spatialBuildingModel(),
    );
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/3d`);
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
    await page.getByTestId('facility-3d-open-room-panel').tap();
    const sheet = page.getByTestId('facility-3d-room-panel');
    await expect(sheet).toBeVisible();
    await sheet.getByTestId('facility-3d-equipment-item').filter({ hasText: 'SN-SPATIAL-2' }).tap();
    await expect(sheet.getByTestId('facility-3d-equipment-detail')).toContainText('SN-SPATIAL-2');
    await page.screenshot({
      path: `tests/e2e/artifacts/facility-spatial-20261003/equipment-${theme}-mobile.png`,
      fullPage: true,
    });
    await page.getByTestId('facility-3d-room-panel-dismiss').tap();
    await expect(sheet).toHaveCount(0);
    await page
      .getByTestId('facility-3d-coordinate-mode')
      .getByRole('button', { name: 'Metric', exact: true })
      .tap();
    await page.getByTestId('facility-3d-isolate-floor').tap();
    await expect(page.getByTestId('facility-3d-equipment-marker')).toBeVisible();
    await page.screenshot({
      path: `tests/e2e/artifacts/facility-spatial-20261003/generated-${theme}-mobile.png`,
      fullPage: true,
    });
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
}
