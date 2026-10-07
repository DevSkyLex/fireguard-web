import { devices, expect, test, type Locator, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  coherenceBuilding,
  coherenceSite,
  E2E_FACILITY_CHILD_ID,
  E2E_FACILITY_ID,
  facilityChildOutput,
  facilityOutput,
  type FacilityBuildingModelOutputFixture,
} from '../support/fixtures/facility-fixtures';
import {
  reviewCalibratedEquipment,
  reviewMoveTree,
  reviewPrimitiveGlb,
  reviewPrimitiveModel,
  reviewPrimitiveBuildingModel,
  reviewUndrawnZone,
} from '../support/fixtures/facility-review-fixes-fixtures';
import {
  spatialFacilityModel,
  spatialGlb,
  type FacilityModelOutputFixture,
} from '../support/fixtures/facility-spatial-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { AssetsExplorerPage } from '../support/pages/assets-explorer.page';
import { FacilitiesPage } from '../support/pages/facilities.page';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

const ARTIFACTS = 'tests/e2e/artifacts/facility-review-fixes-20261003';
const ROUTE = `/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}`;
const INTERVENTION_ID = 'review-parent-intervention';

interface ReviewVector {
  x: number;
  y: number;
  z: number;
  clone(): ReviewVector;
  project(camera: unknown): ReviewVector;
  applyMatrix4(matrix: unknown): ReviewVector;
}
interface ReviewObject {
  visible: boolean;
  isPoints?: boolean;
  parent: ReviewObject | null;
  position: ReviewVector;
  userData: { nodeIndex?: number };
  geometry?: { boundingSphere: { center: ReviewVector } | null; computeBoundingSphere(): void };
  material?: { size?: number; sizeAttenuation?: boolean };
  localToWorld(point: ReviewVector): ReviewVector;
  traverse(visitor: (object: ReviewObject) => void): void;
}
interface ReviewScene {
  ready(): boolean;
  threeModule: { Vector3: new (x: number, y: number, z: number) => ReviewVector } | null;
  camera: unknown;
  importedGroup: ReviewObject | null;
  importedSelectionOutlines: ReviewObject[];
  buildingGroup: ReviewObject | null;
  floorGroups: Map<string, { group: ReviewObject; baseY: number }>;
  renderer: {
    info: {
      memory: { geometries: number; textures: number };
      render: { lines: number; points: number };
    };
  } | null;
  controls: unknown;
  resizeObserver: unknown;
  renderRaf: number | null;
  hoverRaf: number | null;
  explodeRaf: number | null;
}
type ReviewWindow = Window & {
  ng: { getComponent(element: Element): ReviewScene | undefined };
  reviewRetiredScene: {
    scene: ReviewScene;
    memory: { geometries: number; textures: number };
    canvas: HTMLCanvasElement;
  };
  reviewDocument: string;
};

/** Registers all building reads and an authenticated immutable imported asset. */
async function prepareSpatial(
  page: Page,
  projection: FacilityBuildingModelOutputFixture,
  model: FacilityModelOutputFixture,
  bytes: Buffer,
): Promise<ApiMock> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
  await api.mockFacilityPlans(E2E_FACILITY_ID, []);
  await api.mockFacilityBuildingModel(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, projection);
  await api.mockFacilityModels(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [model]);
  await api.mockFacilityModelDownload(model.id, bytes);
  await api.mockFacilityDescendants(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
    facilityChildOutput(),
    facilityChildOutput({
      id: 'e2e-upper-floor',
      '@id': '/api/facilities/e2e-upper-floor',
      name: 'Upper Floor',
    }),
  ]);
  return api;
}

/** Waits for the actual scene graph, rather than only its canvas host, to change mode. */
async function switchMode(page: Page, imported: boolean): Promise<void> {
  await page
    .getByTestId('facility-3d-model-mode')
    .getByRole('button', { name: imported ? 'Imported model' : 'Generated view', exact: true })
    .click();
  const host = page.getByTestId('facility-3d-scene');
  await expect(host.locator('canvas')).toBeVisible();
  await expect
    .poll(() =>
      host.evaluate((element, expected) => {
        const scene = (window as unknown as ReviewWindow).ng.getComponent(
          element.closest('app-facility-building-3d-scene') ?? element,
        );
        return scene?.ready() && (scene.importedGroup !== null) === expected;
      }, imported),
    )
    .toBe(true);
}

/** Reads a calibrated equipment anchor from the real GPU scene's floor transform. */
async function upperEquipmentAnchor(page: Page): Promise<{ x: number; y: number; z: number }> {
  return page.getByTestId('facility-3d-scene').evaluate((element) => {
    const scene = (window as unknown as ReviewWindow).ng.getComponent(
      element.closest('app-facility-building-3d-scene') ?? element,
    );
    const floor = scene?.floorGroups.get('e2e-upper-floor');
    if (!scene?.threeModule || !floor)
      throw new Error('The calibrated upper floor must be rendered.');
    const point = floor.group.localToWorld(new scene.threeModule.Vector3(0.75, 3.08, 0.5));
    return { x: point.x, y: point.y, z: point.z };
  });
}

/** Projects a real primitive center into the canvas so the pointer exercises raycasting. */
async function primitiveCanvasPoint(
  page: Page,
  nodeIndex: number,
): Promise<{ x: number; y: number }> {
  return page.getByTestId('facility-3d-scene').evaluate((element, index) => {
    const scene = (window as unknown as ReviewWindow).ng.getComponent(
      element.closest('app-facility-building-3d-scene') ?? element,
    );
    const canvas = element.querySelector('canvas');
    let primitive: ReviewObject | null = null;
    scene?.importedGroup?.traverse((object) => {
      if (object.userData.nodeIndex === index && object.geometry) primitive = object;
    });
    const object = primitive as ReviewObject | null;
    if (!scene?.camera || !canvas || !object?.geometry)
      throw new Error('The imported primitive must be rendered.');
    object.geometry.computeBoundingSphere();
    const center = object.geometry.boundingSphere?.center.clone();
    if (!center) throw new Error('The primitive needs real bounds.');
    const point = object.localToWorld(center).project(scene.camera);
    return {
      x: ((point.x + 1) * canvas.clientWidth) / 2,
      y: ((1 - point.y) * canvas.clientHeight) / 2,
    };
  }, nodeIndex);
}

/** Checks each drawable's effective visibility through its imported ancestors. */
async function primitiveVisibility(page: Page): Promise<Record<string, boolean>> {
  return page.getByTestId('facility-3d-scene').evaluate((element) => {
    const scene = (window as unknown as ReviewWindow).ng.getComponent(
      element.closest('app-facility-building-3d-scene') ?? element,
    );
    const result: Record<string, boolean> = {};
    scene?.importedGroup?.traverse((object) => {
      if (!object.geometry || object.userData.nodeIndex === undefined) return;
      let cursor: ReviewObject | null = object;
      let visible = true;
      while (cursor) {
        visible &&= cursor.visible;
        cursor = cursor.parent;
      }
      result[String(object.userData.nodeIndex)] = visible;
    });
    return result;
  });
}

/** Measures the Points highlight footprint using the same attenuation as the GPU shader. */
async function pointHighlightDiameterRatio(page: Page): Promise<number> {
  return page.getByTestId('facility-3d-scene').evaluate((element) => {
    const scene = (window as unknown as ReviewWindow).ng.getComponent(
      element.closest('app-facility-building-3d-scene') ?? element,
    );
    const canvas = element.querySelector('canvas');
    const point = scene?.importedSelectionOutlines.find((outline) => outline.isPoints);
    if (!scene?.camera || !point?.geometry || !point.material || !canvas)
      throw new Error('A selected Points primitive must have a live highlight.');
    point.geometry.computeBoundingSphere();
    const center = point.geometry.boundingSphere?.center.clone();
    if (!center) throw new Error('The highlight must have geometry bounds.');
    const camera = scene.camera as { matrixWorldInverse: unknown };
    const depth = Math.abs(point.localToWorld(center).applyMatrix4(camera.matrixWorldInverse).z);
    const size = point.material.size ?? 0;
    const pixels = point.material.sizeAttenuation
      ? (size * canvas.clientHeight) / (2 * depth)
      : size;
    return pixels / Math.min(canvas.clientWidth, canvas.clientHeight);
  });
}

/** Opens the shared create form from either owning page, retaining its real option context. */
async function openParentForm(page: Page, api: ApiMock, intervention: boolean): Promise<Locator> {
  if (!intervention) {
    const facilities = new FacilitiesPage(page);
    await facilities.gotoCreate(E2E_ORGANIZATION_ID);
    return facilities.createRoot;
  }
  await api.mockInterventionDetail(
    interventionOutput({
      id: INTERVENTION_ID,
      '@id': `/api/interventions/${INTERVENTION_ID}`,
      facilitiesCount: 0,
    }),
  );
  await api.mockInterventionWorkItems(INTERVENTION_ID, []);
  await api.mockInterventionChanges(INTERVENTION_ID, []);
  await api.mockInterventionIssues(INTERVENTION_ID, []);
  await api.mockInterventionActivities(INTERVENTION_ID, []);
  await api.mockInterventionAttachments(INTERVENTION_ID, []);
  await api.mockInterventionFacilityList([]);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  const detail = new InterventionDetailPage(page);
  await detail.goto(E2E_ORGANIZATION_ID, INTERVENTION_ID);
  await detail.openFacilitiesTab();
  await detail.addFacilityButton.click();
  return detail.facilitySheet;
}

test('reloads both loaded branches after moving a child and reaches the last of 211 children without loss', async ({
  page,
}, testInfo) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const { source, destination, children, destinationChild, moved } = reviewMoveTree();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, source);
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, destination);
  let completedMove = false;
  const sourcePages: number[] = [];
  const destinationPages: number[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith(`/facilities/${moved.id}/move`))
      completedMove = true;
  });
  await api.mockFacilityListResponses(E2E_ORGANIZATION_ID, (query) => ({
    facilities: query.has('parentForFacilityId') ? [destination] : [source, destination],
  }));
  await api.mockFacilityChildrenResponses(E2E_ORGANIZATION_ID, source.id, (query) => {
    const number = Number(query.get('page') ?? 1);
    sourcePages.push(number);
    const rows = completedMove ? children.slice(1) : children;
    return { facilities: rows.slice((number - 1) * 100, number * 100), totalItems: rows.length };
  });
  await api.mockFacilityChildrenResponses(E2E_ORGANIZATION_ID, destination.id, (query) => {
    destinationPages.push(Number(query.get('page') ?? 1));
    return { facilities: completedMove ? [destinationChild, moved] : [destinationChild] };
  });
  await api.mockFacilityMove(E2E_ORGANIZATION_ID, moved.id, moved);
  const assets = new AssetsExplorerPage(page);
  await assets.goto(E2E_ORGANIZATION_ID);
  const sourceRow = page.locator(`[data-tree-id="${source.id}"]`);
  const destinationRow = page.locator(`[data-tree-id="${destination.id}"]`);
  await sourceRow.getByTestId('tree-toggle').click();
  await expect(assets.treeItems).toHaveCount(102);
  const more = page.getByTestId(`assets-load-more-children-${source.id}`);
  await more.click();
  await expect(assets.treeItems).toHaveCount(202);
  await destinationRow.getByTestId('tree-toggle').click();
  await expect(assets.treeItems).toHaveCount(203);
  await page.locator(`[data-tree-id="${moved.id}"]`).getByTestId('assets-tree-node-menu').click();
  await page.getByTestId('assets-tree-node-move').click();
  await assets.moveDialog.locator('#facility-move-parent').fill(destination.name);
  await page.getByRole('option', { name: new RegExp(destination.name) }).click();
  const moveRequest = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && request.url().endsWith(`/facilities/${moved.id}/move`),
  );
  await assets.moveSubmit.click();
  const request = await moveRequest;
  expect(request.headers()['if-match']).toBe('"revision-1"');
  expect(request.postDataJSON()).toEqual({ parentFacilityId: destination.id });
  await expect(assets.moveDialog).toBeHidden();
  await expect(assets.treeItems).toHaveCount(104);
  await more.click();
  await expect(assets.treeItems).toHaveCount(204);
  await more.click();
  await expect(assets.treeItems).toHaveCount(214);
  await expect(more).toBeHidden();
  const ids = await assets.treeItems.evaluateAll((rows) =>
    rows.map((row) => row.getAttribute('data-tree-id')),
  );
  expect(new Set(ids).size).toBe(214);
  expect(ids).toEqual(expect.arrayContaining(children.map((child) => child.id)));
  expect(sourcePages).toEqual([1, 2, 1, 2, 3]);
  expect(destinationPages).toEqual([1, 1]);
  await page.locator(`[data-tree-id="${children[210].id}"]`).scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/move-paginated-branch-light.png`,
    animations: 'disabled',
    fullPage: true,
  });
});

for (const intervention of [false, true]) {
  test(`clears an incompatible off-page parent while preserving the ${intervention ? 'intervention' : 'organization'} draft`, async ({
    page,
  }, testInfo) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const sites = Array.from({ length: 251 }, (_, index) => coherenceSite(index + 1));
    const buildings = Array.from({ length: 251 }, (_, index) => coherenceBuilding(index + 1));
    const queries: URLSearchParams[] = [];
    await api.mockFacilityListResponses(E2E_ORGANIZATION_ID, (query) => {
      queries.push(query);
      const rows = query.get('parentForType') === 'floor' ? buildings : sites;
      const number = Number(query.get('page') ?? 1);
      return { facilities: rows.slice((number - 1) * 200, number * 200), totalItems: rows.length };
    });
    const form = await openParentForm(page, api, intervention);
    const type = form.getByTestId('facility-create-type');
    await type.click();
    await page.getByRole('option', { name: 'Building', exact: true }).click();
    const name = form.getByTestId('facility-create-name');
    await name.fill('Preserved unsaved draft');
    const code = form.getByTestId('facility-create-code');
    await code.fill('REVIEW-PRESERVED');
    const parent = form.locator('#facility-create-parent');
    await parent.fill(sites[0].name);
    await page.getByRole('option', { name: /Site 001.*Site/ }).click();
    await form.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(form.locator('app-facility-option-picker output')).toHaveText('2 / 2');
    await expect(parent).toHaveValue(sites[0].name);
    await type.click();
    await page.getByRole('option', { name: 'Floor', exact: true }).click();
    await expect(parent).toHaveValue('');
    await expect(name).toHaveValue('Preserved unsaved draft');
    await expect(code).toHaveValue('REVIEW-PRESERVED');
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/facilities'))
        writes.push(request.url());
    });
    await form.getByTestId('facility-create-submit').click();
    await expect(form).toContainText('Choose an admissible parent for this place.');
    expect(writes).toEqual([]);
    await expect(form.locator('app-facility-option-picker output')).toHaveText('1 / 2');
    expect(
      queries.some(
        (query) => query.get('parentForType') === 'building' && query.get('page') === '2',
      ),
    ).toBe(true);
    const scopedQueries = queries.filter((query) => query.has('parentForType'));
    expect(
      scopedQueries.every(
        (query) => query.get('interventionId') === (intervention ? INTERVENTION_ID : null),
      ),
    ).toBe(true);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS}/${testInfo.project.name}/parent-type-${intervention ? 'intervention' : 'organization'}-light.png`,
      animations: 'disabled',
      fullPage: true,
    });
  });
}

test('selects and isolates an undrawn bound zone by keyboard with read-only facilities access', async ({
  page,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  const fixture = reviewUndrawnZone();
  const api = await prepareSpatial(page, fixture.projection, fixture.model, fixture.bytes);
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ['organization.facilities.read', 'organization.equipment.read'],
  });
  await api.mockFacilityDescendants(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
    facilityChildOutput(),
    fixture.floor,
    fixture.zone,
  ]);
  await page.goto(`${ROUTE}/3d`);
  await switchMode(page, true);
  const management = page.getByTestId('facility-3d-model-management');
  await management.locator('summary').click();
  await expect(management.getByTestId('facility-model-upload')).toHaveCount(0);
  const object = management.getByRole('button', { name: /^#0.*Archive object/ });
  await expect(object).toContainText(fixture.zone.name);
  await object.focus();
  await page.keyboard.press('Enter');
  await expect(object).toHaveAttribute('aria-pressed', 'true');
  const link = page.getByTestId('facility-3d-bound-facility-link');
  await expect(link).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/${fixture.zone.id}`,
  );
  await expect(
    page.getByTestId('facility-3d-floor-selector-option').filter({ hasText: fixture.floor.name }),
  ).toHaveAttribute('aria-pressed', 'true');
  await management.locator('summary').click();
  await page
    .getByTestId('facility-3d-floor-selector-option')
    .filter({ hasText: 'Ground Floor' })
    .click();
  await expect(link).toHaveCount(0);
  await management.locator('summary').click();
  await expect(object).toHaveAttribute('aria-pressed', 'false');
  await object.focus();
  await page.keyboard.press('Enter');
  await expect(link).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/${fixture.zone.id}`,
  );
  await management.locator('summary').click();
  const isolate = page.getByTestId('facility-3d-isolate-floor');
  await isolate.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('facility-3d-show-all')).toBeVisible();
  await expect(link).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/undrawn-zone-readonly-keyboard-light.png`,
    animations: 'disabled',
    fullPage: true,
  });
  await link.focus();
  await page.keyboard.press('Escape');
  await expect(link).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('preserves calibrated upper-floor equipment when switching from generated exploded view to the imported model', async ({
  page,
}, testInfo) => {
  await prepareSpatial(page, reviewCalibratedEquipment(), spatialFacilityModel(), spatialGlb());
  await page.goto(`${ROUTE}/3d`);
  await switchMode(page, true);
  const initial = await upperEquipmentAnchor(page);
  expect(initial.x).toBeCloseTo(6, 6);
  expect(initial.y).toBeCloseTo(6.08, 6);
  expect(initial.z).toBeCloseTo(4, 6);
  await switchMode(page, false);
  await page
    .getByTestId('facility-3d-coordinate-mode')
    .getByRole('button', { name: 'Metric', exact: true })
    .click();
  await page.getByTestId('facility-3d-explode-toggle').click();
  await expect
    .poll(async () => (await upperEquipmentAnchor(page)).y)
    .toBeGreaterThan(initial.y + 0.1);
  await switchMode(page, true);
  await expect.poll(() => upperEquipmentAnchor(page)).toEqual(initial);
  await expect(
    page.getByTestId('facility-3d-equipment-marker').filter({ hasText: 'SN-UPPER-FRAME' }),
  ).toBeVisible();
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/imported-calibrated-equipment-light.png`,
    animations: 'disabled',
    fullPage: true,
  });
});

test('picks and isolates GLB Line and Points primitives and releases their real GPU resources on SPA navigation', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await prepareSpatial(
    page,
    reviewPrimitiveBuildingModel(),
    reviewPrimitiveModel(),
    reviewPrimitiveGlb(),
  );
  await page.goto(`${ROUTE}/3d`);
  await page.getByTestId('facility-3d-model-management').locator('summary').click();
  await switchMode(page, true);
  await page.getByTestId('facility-3d-model-management').locator('summary').click();
  const host = page.getByTestId('facility-3d-scene');
  const canvas = host.locator('canvas');
  await expect
    .poll(
      () =>
        host.evaluate((element) => {
          const scene = (window as unknown as ReviewWindow).ng.getComponent(
            element.closest('app-facility-building-3d-scene') ?? element,
          );
          const info = scene?.renderer?.info;
          return {
            geometriesAllocated: (info?.memory.geometries ?? 0) >= 2,
            linesDrawn: (info?.render.lines ?? 0) > 0,
            pointsDrawn: (info?.render.points ?? 0) > 0,
          };
        }),
      { timeout: 5_000, message: 'Both fixture primitives must reach the GPU before selection.' },
    )
    .toEqual({ geometriesAllocated: true, linesDrawn: true, pointsDrawn: true });
  await canvas.click({ position: await primitiveCanvasPoint(page, 0) });
  const link = page.getByTestId('facility-3d-bound-facility-link');
  await expect(link).toHaveAttribute(
    'href',
    `${ROUTE.replace(E2E_FACILITY_ID, E2E_FACILITY_CHILD_ID)}`,
  );
  await page.getByTestId('facility-3d-isolate-floor').click();
  await expect.poll(() => primitiveVisibility(page)).toEqual({ '0': true, '1': false });
  await page.getByTestId('facility-3d-show-all').click();
  await expect.poll(() => primitiveVisibility(page)).toEqual({ '0': true, '1': true });
  await canvas.click({ position: await primitiveCanvasPoint(page, 1) });
  await expect(link).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/e2e-upper-floor`,
  );
  await page.getByTestId('facility-3d-isolate-floor').click();
  await expect.poll(() => primitiveVisibility(page)).toEqual({ '0': false, '1': true });
  await expect.poll(() => pointHighlightDiameterRatio(page)).toBeLessThan(0.25);
  expect(await pointHighlightDiameterRatio(page)).toBeGreaterThan(0);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/line-points-selection-dark.png`,
    animations: 'disabled',
    fullPage: true,
  });
  const pointProjection = await primitiveCanvasPoint(page, 1);
  const background = { x: 12, y: 12 };
  expect(
    Math.hypot(pointProjection.x - background.x, pointProjection.y - background.y),
  ).toBeGreaterThan(200);
  await canvas.click({ position: background });
  await expect(
    link,
    'A click more than 200 CSS pixels from the isolated point must select the background.',
  ).toHaveCount(0);
  await canvas.click({ position: await primitiveCanvasPoint(page, 1) });
  await expect(link).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/facilities/e2e-upper-floor`,
  );
  await expect
    .poll(
      () =>
        host.evaluate((element) => {
          const scene = (window as unknown as ReviewWindow).ng.getComponent(
            element.closest('app-facility-building-3d-scene') ?? element,
          );
          const info = scene?.renderer?.info;
          return {
            geometriesAllocated: (info?.memory.geometries ?? 0) >= 2,
            selectedPointDrawn: (info?.render.points ?? 0) >= 2,
            frameSettled: scene?.renderRaf === null,
          };
        }),
      {
        message:
          'Reselected Points and their replacement highlight must reach the GPU before teardown.',
      },
    )
    .toEqual({ geometriesAllocated: true, selectedPointDrawn: true, frameSettled: true });
  const documentId = await host.evaluate((element) => {
    const browser = window as unknown as ReviewWindow;
    const scene = browser.ng.getComponent(
      element.closest('app-facility-building-3d-scene') ?? element,
    );
    const canvasElement = element.querySelector('canvas');
    if (!scene?.renderer || !canvasElement) throw new Error('A live GPU scene is required.');
    if (scene.renderer.info.memory.geometries < 2)
      throw new Error('Both primitive geometries must have reached the GPU.');
    browser.reviewRetiredScene = {
      scene,
      memory: scene.renderer.info.memory,
      canvas: canvasElement,
    };
    browser.reviewDocument = crypto.randomUUID();
    return browser.reviewDocument;
  });
  await page.getByRole('link', { name: 'Back to facility', exact: true }).click();
  await expect(page.getByTestId('facility-detail-3d-link')).toBeVisible();
  await expect(host).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const browser = window as unknown as ReviewWindow;
        const { scene, memory } = browser.reviewRetiredScene;
        return {
          geometries: memory.geometries,
          textures: memory.textures,
          ready: scene.ready(),
          renderer: scene.renderer,
          controls: scene.controls,
          observer: scene.resizeObserver,
          imported: scene.importedGroup,
          building: scene.buildingGroup,
          render: scene.renderRaf,
          hover: scene.hoverRaf,
          explode: scene.explodeRaf,
          document: browser.reviewDocument,
        };
      }),
    )
    .toEqual({
      geometries: 0,
      textures: 0,
      ready: false,
      renderer: null,
      controls: null,
      observer: null,
      imported: null,
      building: null,
      render: null,
      hover: null,
      explode: null,
      document: documentId,
    });
  expect(errors).toEqual([]);
});

test('keeps an undrawn bound zone accessible and isolateable on light and dark touch viewports', async ({
  browser,
  browserName,
  baseURL,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'The Pixel 5 context exercises Android touch in Chromium.');
  const url = baseURL ?? 'http://localhost:4273';
  const context = await browser.newContext({ ...devices['Pixel 5'], baseURL: url });
  try {
    await emulateMobilePlatform(context, 'android');
    const page = await context.newPage();
    const errors = collectConsoleErrors(page);
    const fixture = reviewUndrawnZone();
    const api = await prepareSpatial(page, fixture.projection, fixture.model, fixture.bytes);
    await api.mockFacilityDescendants(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
      facilityChildOutput(),
      fixture.floor,
      fixture.zone,
    ]);
    /* eslint-disable no-await-in-loop -- Each theme boots the same touch route with its own preference cookie. */
    for (const theme of ['light', 'dark']) {
      await context.addCookies([{ name: 'theme-preference', value: theme, url }]);
      await page.goto(`${ROUTE}/3d`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await switchMode(page, true);
      const management = page.getByTestId('facility-3d-model-management');
      await management.locator('summary').tap();
      await management.getByRole('button', { name: /^#0.*Archive object/ }).tap();
      await management.locator('summary').tap();
      await page.getByTestId('facility-3d-isolate-floor').tap();
      await expect(page.getByTestId('facility-3d-bound-facility-link')).toHaveAttribute(
        'href',
        `/organizations/${E2E_ORGANIZATION_ID}/facilities/${fixture.zone.id}`,
      );
      await expect(page.getByTestId('facility-3d-show-all')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS}/${testInfo.project.name}/undrawn-zone-touch-${theme}.png`,
        animations: 'disabled',
        fullPage: true,
      });
    }
    /* eslint-enable no-await-in-loop */
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
