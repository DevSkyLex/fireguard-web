import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_FACILITY_CHILD_ID,
  E2E_FACILITY_ID,
  facilityOutput,
} from '../support/fixtures/facility-fixtures';
import { spatialLegacyBuildingModel } from '../support/fixtures/facility-spatial-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';

for (const theme of ['light', 'dark'] as const) {
  test(`renders the French spatial controls and equipment marker in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    const touch = info.project.name.endsWith('touch');
    if (touch) await emulateMobilePlatform(context, 'android');
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4274');
    const errors = collectConsoleErrors(page);
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityBuildingModel(
      E2E_ORGANIZATION_ID,
      E2E_FACILITY_ID,
      spatialLegacyBuildingModel(),
    );
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/3d`);
    await expect(page.getByRole('heading', { name: 'Lieu', exact: true })).toBeVisible();
    await expect(page.getByTestId('facility-3d-model-management').locator('summary')).toHaveText(
      'Importer et gérer une maquette du bâtiment',
    );
    await page
      .getByTestId('facility-3d-coordinate-mode')
      .getByRole('button', { name: 'Métrique', exact: true })
      .click();
    const isolate = page.getByTestId('facility-3d-isolate-floor');
    await expect(isolate).toHaveText('Isoler cet étage');
    await isolate.click();
    await expect(page.getByTestId('facility-3d-show-all')).toHaveText('Tout afficher');
    await expect(page.getByTestId('facility-3d-equipment-marker')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/e2e/artifacts/facility-spatial-20261003/fr-${theme}-${touch ? 'mobile' : 'desktop'}.png`,
      animations: 'disabled',
      fullPage: true,
    });
    if (touch) await page.getByTestId('facility-3d-open-room-panel').tap();
    const panel = page.getByTestId('facility-3d-room-panel');
    const warning = panel.getByTestId('facility-3d-hierarchy-issues');
    await expect(warning).toContainText('La hiérarchie est à corriger');
    await expect(warning).toContainText('Le type du parent est incompatible');
    await expect(warning).toContainText('Un ancêtre est invalide');
    await expect(warning.getByRole('link', { name: 'Ground Floor', exact: true })).toHaveAttribute(
      'href',
      `/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_CHILD_ID}`,
    );
    await expect(
      panel.getByTestId('facility-3d-floor-selector-option').filter({ hasText: 'Ground Floor' }),
    ).not.toContainText('Incomplet');
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/e2e/artifacts/facility-spatial-20261003/fr-${theme}-${touch ? 'mobile' : 'desktop'}-hierarchy.png`,
      animations: 'disabled',
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
