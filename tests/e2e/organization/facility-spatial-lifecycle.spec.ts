import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  spatialBuildingModel,
  spatialFacilityModel,
  spatialPlanPng,
} from '../support/fixtures/facility-spatial-fixtures';
import { collectConsoleErrors } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

interface RendererMemory {
  geometries: number;
  textures: number;
}

interface SceneLifecycle {
  renderer: { info: { memory: RendererMemory } } | null;
  controls: unknown | null;
  resizeObserver: ResizeObserver | null;
  buildingGroup: unknown | null;
  importedGroup: unknown | null;
  renderRaf: number | null;
  hoverRaf: number | null;
  explodeRaf: number | null;
  pointerDownPoint: { x: number; y: number } | null;
  lastPointerEvent: PointerEvent | null;
  ready(): boolean;
}

interface LifecycleRecord {
  scene: SceneLifecycle;
  memory: RendererMemory;
  canvas: HTMLCanvasElement;
}

type LifecycleWindow = Window & {
  ng: { getComponent(element: Element): SceneLifecycle | undefined };
  facilitySpatialLifecycle: LifecycleRecord[];
  facilitySpatialDocument: string;
};

/** A genuinely embedded textured GLB lets the test detect texture leaks as well as geometry leaks. */
function texturedGlb(): Buffer {
  const positionsAndUv = Buffer.alloc(60);
  [0, 0, 0, 12, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 1].forEach((value, index) =>
    positionsAndUv.writeFloatLE(value, index * 4),
  );
  const image = spatialPlanPng();
  const unpaddedBinary = Buffer.concat([positionsAndUv, image]);
  const binary = Buffer.concat([
    unpaddedBinary,
    Buffer.alloc((4 - (unpaddedBinary.length % 4)) % 4),
  ]);
  const document = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Ground Floor', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    materials: [
      {
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
    textures: [{ source: 0 }],
    images: [{ bufferView: 2, mimeType: 'image/png' }],
    buffers: [{ byteLength: unpaddedBinary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      { buffer: 0, byteOffset: 60, byteLength: image.length },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [12, 8, 0],
      },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
    ],
  };
  const jsonText = JSON.stringify(document);
  const json = Buffer.from(jsonText.padEnd(Math.ceil(Buffer.byteLength(jsonText) / 4) * 4, ' '));
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + binary.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(binary.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, binaryHeader, binary]);
}

test('releases real GPU resources and interaction work through five SPA scene lifecycles', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  const route = `/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}`;
  const bytes = texturedGlb();
  const model = { ...spatialFacilityModel(), fileSize: bytes.length };
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {});
  await api.mockFacilityPlans(E2E_FACILITY_ID, []);
  await api.mockFacilityBuildingModel(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, spatialBuildingModel());
  await api.mockFacilityModels(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [model]);
  await api.mockFacilityModelDownload(model.id, bytes);
  await page.goto(route);
  const documentId = await page.evaluate(() => {
    const browser = window as unknown as LifecycleWindow;
    browser.facilitySpatialLifecycle = [];
    browser.facilitySpatialDocument = crypto.randomUUID();
    return browser.facilitySpatialDocument;
  });

  /* eslint-disable no-await-in-loop -- Each SPA lifecycle depends on the previous scene's complete destruction. */
  for (let cycle = 0; cycle < 5; cycle++) {
    await page.getByTestId('facility-detail-3d-link').click();
    const imported = cycle % 2 === 0;
    const selector = page.getByTestId('facility-3d-model-mode');
    await expect(selector).toBeVisible();
    await selector
      .getByRole('button', {
        name: imported ? 'Imported model' : 'Generated view',
        exact: true,
      })
      .click();
    const host = page.getByTestId('facility-3d-scene');
    await expect(host.locator('canvas')).toBeVisible();
    await expect
      .poll(async () =>
        host.evaluate((element, expectedImported) => {
          const scene = (window as unknown as LifecycleWindow).ng.getComponent(
            element.closest('app-facility-building-3d-scene') ?? element,
          );
          return scene?.ready() && (scene.importedGroup !== null) === expectedImported;
        }, imported),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        host.evaluate((element) => {
          const scene = (window as unknown as LifecycleWindow).ng.getComponent(
            element.closest('app-facility-building-3d-scene') ?? element,
          );
          return scene?.renderer?.info.memory.geometries ?? 0;
        }),
      )
      .toBeGreaterThan(0);
    if (imported) {
      await expect
        .poll(async () =>
          host.evaluate((element) => {
            const scene = (window as unknown as LifecycleWindow).ng.getComponent(
              element.closest('app-facility-building-3d-scene') ?? element,
            );
            return scene?.renderer?.info.memory.textures ?? 0;
          }),
        )
        .toBeGreaterThan(0);
    }

    await host.evaluate((element) => {
      const browser = window as unknown as LifecycleWindow;
      const scene = browser.ng.getComponent(
        element.closest('app-facility-building-3d-scene') ?? element,
      );
      const canvas = element.querySelector('canvas');
      if (!scene?.renderer || !canvas) throw new Error('A live WebGL scene is required.');
      browser.facilitySpatialLifecycle.push({
        scene,
        memory: scene.renderer.info.memory,
        canvas,
      });
    });
    if (!imported) await page.getByTestId('facility-3d-explode-toggle').click();
    await host.locator('canvas').dispatchEvent('pointermove', { clientX: 100, clientY: 100 });
    await page.getByRole('link', { name: 'Back to facility', exact: true }).click();
    await expect(page.getByTestId('facility-detail-3d-link')).toBeVisible();
    await expect(host).toHaveCount(0);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          return (window as unknown as LifecycleWindow).facilitySpatialLifecycle.map(
            ({ scene, memory }) => ({
              geometries: memory.geometries,
              textures: memory.textures,
              ready: scene.ready(),
              renderer: scene.renderer === null,
              controls: scene.controls === null,
              observer: scene.resizeObserver === null,
              building: scene.buildingGroup === null,
              render: scene.renderRaf === null,
              hover: scene.hoverRaf === null,
              explode: scene.explodeRaf === null,
            }),
          );
        }),
      )
      .toEqual(
        Array.from({ length: cycle + 1 }, () => ({
          geometries: 0,
          textures: 0,
          ready: false,
          renderer: true,
          controls: true,
          observer: true,
          building: true,
          render: true,
          hover: true,
          explode: true,
        })),
      );

    const retired = await page.evaluate(() => {
      const records = (window as unknown as LifecycleWindow).facilitySpatialLifecycle;
      const record = records[records.length - 1];
      record.canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 20, clientY: 20 }));
      record.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 25, clientY: 25 }));
      const contextLoss = new Event('webglcontextlost', { cancelable: true });
      record.canvas.dispatchEvent(contextLoss);
      return {
        down: record.scene.pointerDownPoint,
        move: record.scene.lastPointerEvent,
        hover: record.scene.hoverRaf,
        contextLossPrevented: contextLoss.defaultPrevented,
        document: (window as unknown as LifecycleWindow).facilitySpatialDocument,
      };
    });
    expect(retired).toEqual({
      down: null,
      move: null,
      hover: null,
      contextLossPrevented: false,
      document: documentId,
    });
  }
  /* eslint-enable no-await-in-loop */
  expect(errors).toEqual([]);
});
