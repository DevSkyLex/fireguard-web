import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_FACILITY_ID,
  E2E_FACILITY_PLAN_EQUIPMENT_ID,
  E2E_FACILITY_PLAN_ZONE_ID,
  facilityOutput,
  facilityChildOutput,
  facilityAttachmentOutput,
  facilityPlanOverlayOutput,
} from '../support/fixtures/facility-fixtures';
import {
  spatialBuildingModel,
  spatialLegacyBuildingModel,
  spatialFacilityModel,
  spatialGlb,
  spatialPlanPng,
} from '../support/fixtures/facility-spatial-fixtures';
import { collectConsoleErrors, expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

const ARTIFACTS = 'tests/e2e/artifacts/facility-coherence-20261003';

test('keeps a legacy floor metric and shows its corrective link through keyboard floor selection', async ({
  page,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  const model = spatialLegacyBuildingModel();
  await api.mockFacilityBuildingModel(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, model);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/3d`);
  await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Metric', exact: true }).click();
  const floors = page.getByTestId('facility-3d-floor-selector-option');
  const legacyFloor = floors.filter({ hasText: 'Ground Floor' });
  await expect(legacyFloor).toContainText('Hierarchy needs correction');
  await expect(legacyFloor).not.toContainText('Incomplete');
  const upperFloor = floors.filter({ hasText: 'Upper Floor' });
  await upperFloor.focus();
  await expect(upperFloor).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(upperFloor).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('facility-3d-hierarchy-issues')).toBeHidden();
  await legacyFloor.focus();
  await expect(legacyFloor).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(legacyFloor).toHaveAttribute('aria-current', 'true');
  const warning = page.getByTestId('facility-3d-hierarchy-issues');
  await expect(warning).toContainText('parent type is incompatible');
  await expect(warning).toContainText('ancestor is invalid');
  await expect(warning.getByRole('link', { name: 'Ground Floor', exact: true })).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/${model.floors[0].facilityId}`,
  );
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/legacy-floor-keyboard-light.png`,
    animations: 'disabled',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('keeps retained contour, equipment and calibration diagnostics reachable even when the plan has no usable overlay', async ({
  page,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const floor = facilityChildOutput({ geometryIssue: 'outside_ancestry' });
  const plan = facilityAttachmentOutput({
    facilityId: floor.id,
    calibration: { widthMeters: 12, rotationDegrees: 0, offsetXMeters: 0, offsetZMeters: 0 },
    calibrationBuildingId: 'former-building',
    calibrationIssue: 'building_changed',
  });
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, floor);
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, floor.id);
  await api.mockFacilityPlans(floor.id, [plan], undefined, {
    contentType: 'image/png',
    body: spatialPlanPng(),
  });
  await api.mockFacilityPlanOverlay(
    E2E_ORGANIZATION_ID,
    floor.id,
    facilityPlanOverlayOutput({
      zones: [],
      equipment: [],
      geometryIssues: [{ facilityId: E2E_FACILITY_PLAN_ZONE_ID, code: 'outside_ancestry' }],
      equipmentIssues: [{ equipmentId: E2E_FACILITY_PLAN_EQUIPMENT_ID, code: 'outside_ancestry' }],
    }),
  );
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${floor.id}?tab=plans`);
  await expect(page.getByTestId('facility-plan-own-geometry-issue')).toContainText(
    'current hierarchy',
  );
  await expect(page.getByTestId('facility-plan-calibration-issue')).toContainText(
    'another building',
  );
  const issues = page.getByTestId('facility-plan-spatial-issues');
  await expect(issues).toBeVisible();
  await expect(issues.getByRole('link', { name: /^Review facility/ })).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_PLAN_ZONE_ID}`,
  );
  await expect(issues.getByRole('link', { name: /^Review equipment/ })).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/equipments/${E2E_FACILITY_PLAN_EQUIPMENT_ID}`,
  );
  await expect(page.getByTestId('facility-plan-no-content')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/retained-plan-diagnostics.png`,
    animations: 'disabled',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('renders an active GLB with an unavailable association neutrally and clears any previous room selection', async ({
  page,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  await api.mockFacilityBuildingModel(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, spatialBuildingModel());
  const model = spatialFacilityModel();
  await api.mockFacilityModels(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
    { ...model, bindings: [], bindingIssues: [{ nodeIndex: 0, code: 'target_unavailable' }] },
  ]);
  await api.mockFacilityModelDownload(model.id, spatialGlb());
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/3d`);
  const modes = page.getByTestId('facility-3d-model-mode');
  await expect(modes).toBeVisible();
  await modes.getByRole('button', { name: 'Generated view' }).click();
  const storage = page.getByRole('option', { name: /^Storage\s+Active$/ });
  await storage.click();
  await expect(page.getByTestId('facility-3d-selection-announcement')).toContainText('Storage');
  await modes.getByRole('button', { name: 'Imported model' }).click();
  await expect(page.getByTestId('facility-3d-scene').locator('canvas')).toBeVisible();
  await page.getByTestId('facility-3d-model-management').locator('summary').click();
  const issues = page.getByTestId('facility-model-binding-issues');
  await expect(issues).toContainText('associated facility is unavailable');
  await issues.getByRole('button').click();
  await expect(page.getByTestId('facility-3d-selection-announcement')).not.toContainText('Storage');
  await expect(storage).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('#model-node-facility')).toHaveValue('');
  await expect(page.getByTestId('facility-model-binding-issue')).toContainText(
    'Reassign or remove',
  );
  await expect(
    page.getByTestId('facility-3d-floor-selector-option').filter({ hasText: 'Ground Floor' }),
  ).toHaveAttribute('aria-current', 'true');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/glb-unavailable-association.png`,
    animations: 'disabled',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
