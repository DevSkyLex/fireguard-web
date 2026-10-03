/* eslint-disable no-await-in-loop -- Vertex placement and keyboard input operate the same editor sequentially. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_FACILITY_CHILD_ID,
  E2E_FACILITY_ID,
  E2E_FACILITY_PLAN_ID,
  facilityAttachmentOutput,
  facilityChildOutput,
} from '../support/fixtures/facility-fixtures';
import { spatialPlanPng } from '../support/fixtures/facility-spatial-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { FacilitiesPage } from '../support/pages/facilities.page';

const SCREENSHOTS = 'tests/e2e/artifacts/facility-spatial-20261003';
const calibration = { widthMeters: 12, rotationDegrees: -90, offsetXMeters: -5, offsetZMeters: 2 };
const plan = {
  ...facilityAttachmentOutput({ facilityId: E2E_FACILITY_CHILD_ID }),
  calibration: null,
};

/** Opens the real floor detail page on a non-square plan, with an empty initial overlay. */
async function prepare(page: Page): Promise<{ api: ApiMock; facilities: FacilitiesPage }> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(
    E2E_ORGANIZATION_ID,
    facilityChildOutput({
      path: [{ id: E2E_FACILITY_ID, name: 'North Building', type: 'building' }],
    }),
  );
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_CHILD_ID);
  await api.mockFacilityPlans(E2E_FACILITY_CHILD_ID, [plan], undefined, {
    contentType: 'image/png',
    body: spatialPlanPng(),
  });
  const facilities = new FacilitiesPage(page);
  await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_CHILD_ID);
  await facilities.plansTab.click();
  await expect(facilities.editorStage).toBeVisible();
  await expect(page.getByTestId('facility-plan-trace-floor')).toBeEnabled();
  return { api, facilities };
}

/** Uses focused keyboard input, including activation of buttons, without a pointer. */
async function keyboardValue(input: Locator, value: string): Promise<void> {
  await input.focus();
  await input.press('ControlOrMeta+A');
  await input.pressSequentially(value);
  await input.press('Tab');
}

/** Exercises the pointer-to-dialog linkage and checks both measured coordinates are populated. */
async function measure(page: Page, facilities: FacilitiesPage): Promise<Locator> {
  await page.getByTestId('facility-plan-calibrate').click();
  await expect(facilities.editorStatus).toBeVisible();
  await expect(facilities.editorStage).toHaveCSS('pointer-events', 'auto');
  await facilities.editorStage.scrollIntoViewIfNeeded();
  await facilities.clickPlanPoint(0.2, 0.2);
  await expect(page.getByTestId('facility-plan-editor-draft').locator('circle')).toHaveCount(1);
  await facilities.clickPlanPoint(0.8, 0.2);
  const dialog = page.getByTestId('facility-plan-calibration-dialog');
  await expect(dialog).toBeVisible();
  expect(Number(await dialog.locator('#calibration-x1').inputValue())).toBeCloseTo(20, 0);
  expect(Number(await dialog.locator('#calibration-x2').inputValue())).toBeCloseTo(80, 0);
  await dialog.locator('#calibration-distanceMeters').fill('6');
  await dialog.getByTestId('facility-calibration-measure').click();
  await expect
    .poll(async () => Number(await dialog.locator('#calibration-widthMeters').inputValue()))
    .toBeCloseTo(10, 1);
  return dialog;
}

test('traces the floor footprint on its own plan and sends normalized geometry to that floor', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  const { api, facilities } = await prepare(page);
  let body: unknown;
  await api.mockFacilityPlanGeometry(E2E_ORGANIZATION_ID, E2E_FACILITY_CHILD_ID, (request) => {
    body = request;
  });
  await expect(page.getByTestId('facility-detail-3d-link')).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/3d`,
  );
  await page.getByTestId('facility-plan-trace-floor').click();
  await expect(facilities.editorStatus).toBeVisible();
  await expect(facilities.editorStage).toHaveCSS('pointer-events', 'auto');
  await facilities.editorStage.scrollIntoViewIfNeeded();
  let vertexCount = 0;
  for (const [x, y] of [
    [0.1, 0.1],
    [0.1, 0.6],
    [0.7, 0.6],
    [0.7, 0.1],
  ]) {
    await facilities.clickPlanPoint(x, y);
    await expect(page.getByTestId('facility-plan-editor-draft').locator('circle')).toHaveCount(
      ++vertexCount,
    );
  }
  await expect(page.getByTestId('facility-plan-editor-draft').locator('circle')).toHaveCount(4);
  await expect(facilities.editorClosePolygon).toBeEnabled();
  await page.screenshot({
    path: `${SCREENSHOTS}/floor-footprint-pointer.png`,
    animations: 'disabled',
  });
  await facilities.editorClosePolygon.click();
  await expect(facilities.editorStatus).toHaveCount(0);
  expect(body).toMatchObject({ attachmentId: E2E_FACILITY_PLAN_ID });
  const points = (body as { points: number[][] }).points;
  expect(points).toHaveLength(4);
  for (const [index, target] of [
    [0.1, 0.1],
    [0.1, 0.6],
    [0.7, 0.6],
    [0.7, 0.1],
  ].entries()) {
    expect(points[index][0]).toBeCloseTo(target[0], 2);
    expect(points[index][1]).toBeCloseTo(target[1], 2);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('saves a floor footprint through keyboard coordinates without changing the normalized contract', async ({
  page,
}) => {
  const { api, facilities } = await prepare(page);
  let body: unknown;
  await api.mockFacilityPlanGeometry(E2E_ORGANIZATION_ID, E2E_FACILITY_CHILD_ID, (request) => {
    body = request;
  });
  await page.getByTestId('facility-plan-trace-floor').focus();
  await page.keyboard.press('Enter');
  await facilities.editorEnterCoordinates.focus();
  await page.keyboard.press('Enter');
  await expect(facilities.zoneGeometryDialog).toBeVisible();
  await expect(facilities.zoneGeometryDialog).toContainText('Ground Floor');
  for (const [index, coordinates] of [
    ['10', '10'],
    ['10', '40'],
    ['40', '40'],
  ].entries()) {
    const row = facilities.zoneGeometryRows.nth(index);
    await keyboardValue(row.getByTestId('facility-plan-zone-geometry-row-x'), coordinates[0]);
    await keyboardValue(row.getByTestId('facility-plan-zone-geometry-row-y'), coordinates[1]);
  }
  await expect(facilities.zoneGeometrySubmit).toBeEnabled();
  await facilities.zoneGeometrySubmit.focus();
  await page.keyboard.press('Enter');
  await expect(facilities.zoneGeometryDialog).toBeHidden();
  expect(body).toEqual({
    attachmentId: E2E_FACILITY_PLAN_ID,
    points: [
      [0.1, 0.1],
      [0.1, 0.4],
      [0.4, 0.4],
    ],
  });
});

test('calibrates two clicked points with a distance and revision-protected attachment update', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  const { api, facilities } = await prepare(page);
  let body: unknown;
  let ifMatch: string | undefined;
  await api.mockFacilityPlanCalibration(
    E2E_FACILITY_PLAN_ID,
    { ...plan, revision: 2, calibration: { ...calibration, widthMeters: 10 } },
    {
      onRequest: (request, header) => {
        body = request;
        ifMatch = header;
      },
    },
  );
  const dialog = await measure(page, facilities);
  await dialog.locator('#calibration-rotationDegrees').fill('-90');
  await dialog.locator('#calibration-offsetXMeters').fill('-5');
  await dialog.locator('#calibration-offsetZMeters').fill('2');
  await page.screenshot({
    path: `${SCREENSHOTS}/floor-calibration-pointer.png`,
    animations: 'disabled',
  });
  await dialog.getByTestId('facility-calibration-save').click();
  await expect(dialog).toBeHidden();
  expect(ifMatch).toBe('"revision-1"');
  expect(body).toMatchObject({
    calibration: { rotationDegrees: -90, offsetXMeters: -5, offsetZMeters: 2 },
  });
  expect((body as { calibration: typeof calibration }).calibration.widthMeters).toBeCloseTo(10, 1);
  await expect(page.getByTestId('facility-plan-editor-draft')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('calibrates a non-square image through keyboard measurement and retains its uniform scale', async ({
  page,
}) => {
  const { api } = await prepare(page);
  let body: unknown;
  let ifMatch: string | undefined;
  await api.mockFacilityPlanCalibration(
    E2E_FACILITY_PLAN_ID,
    { ...plan, revision: 2, calibration },
    {
      onRequest: (request, header) => {
        body = request;
        ifMatch = header;
      },
    },
  );
  await page.getByTestId('facility-plan-calibration-coordinates').focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('facility-plan-calibration-dialog');
  await expect(dialog).toBeVisible();
  for (const [field, value] of Object.entries({
    x1: '10',
    y1: '10',
    x2: '10',
    y2: '60',
    distanceMeters: '4',
  })) {
    await keyboardValue(dialog.locator(`#calibration-${field}`), value);
  }
  await expect(dialog.getByTestId('facility-calibration-measure')).toBeEnabled();
  await dialog.getByTestId('facility-calibration-measure').focus();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('#calibration-widthMeters')).toHaveValue('12');
  for (const [field, value] of Object.entries({
    rotationDegrees: '-90',
    offsetXMeters: '-5',
    offsetZMeters: '2',
  })) {
    await keyboardValue(dialog.locator(`#calibration-${field}`), value);
  }
  await expectNoInternalOverflow(dialog);
  await page.screenshot({
    path: `${SCREENSHOTS}/floor-calibration-keyboard.png`,
    animations: 'disabled',
  });
  await dialog.getByTestId('facility-calibration-save').focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  expect(ifMatch).toBe('"revision-1"');
  expect(body).toEqual({ calibration });
});

test('retains calibration and measurement drafts after a conflict and retries with the refreshed revision', async ({
  page,
  context,
  baseURL,
}) => {
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await page.setViewportSize({ width: 375, height: 800 });
  const { api, facilities } = await prepare(page);
  const requests: Array<{ body: unknown; ifMatch: string | undefined }> = [];
  const onRequest = (body: unknown, ifMatch: string | undefined): void => {
    requests.push({ body, ifMatch });
  };
  await api.mockFacilityPlanCalibration(
    E2E_FACILITY_PLAN_ID,
    { ...plan, revision: 2, calibration },
    { status: 412, onRequest },
  );
  const dialog = await measure(page, facilities);
  await dialog.locator('#calibration-widthMeters').fill('24');
  await dialog.locator('#calibration-rotationDegrees').fill('-90');
  await dialog.locator('#calibration-offsetXMeters').fill('-5');
  await dialog.locator('#calibration-offsetZMeters').fill('2');
  const point1 = await dialog.locator('#calibration-x1').inputValue();
  const point2 = await dialog.locator('#calibration-x2').inputValue();
  await api.mockFacilityPlans(E2E_FACILITY_CHILD_ID, [{ ...plan, revision: 2 }], undefined, {
    contentType: 'image/png',
    body: spatialPlanPng(),
  });
  await dialog.getByTestId('facility-calibration-save').click();
  await expect(dialog.getByRole('alert')).toContainText('Your coordinates have been kept');
  await expect(
    page.getByRole('status').filter({ hasText: 'Your coordinates have been kept' }),
  ).toHaveCount(0);
  await expect(dialog.getByTestId('facility-calibration-save')).toBeEnabled();
  await expect(dialog.locator('#calibration-widthMeters')).toHaveValue('24');
  await expect(dialog.locator('#calibration-distanceMeters')).toHaveValue('6');
  await expect(dialog.locator('#calibration-x1')).toHaveValue(point1);
  await expect(dialog.locator('#calibration-x2')).toHaveValue(point2);
  await expect(dialog.locator('#calibration-rotationDegrees')).toHaveValue('-90');
  await expect(dialog.locator('#calibration-offsetXMeters')).toHaveValue('-5');
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(dialog);
  await page.screenshot({
    path: `${SCREENSHOTS}/floor-calibration-conflict-dark-narrow.png`,
    animations: 'disabled',
  });
  await api.mockFacilityPlanCalibration(
    E2E_FACILITY_PLAN_ID,
    { ...plan, revision: 3, calibration: { ...calibration, widthMeters: 24 } },
    { onRequest },
  );
  await dialog.getByTestId('facility-calibration-save').click();
  await expect(dialog).toBeHidden();
  expect(requests.map((request) => request.ifMatch)).toEqual(['"revision-1"', '"revision-2"']);
  expect(requests[0].body).toEqual(requests[1].body);
  expect(requests[1].body).toEqual({ calibration: { ...calibration, widthMeters: 24 } });
});
