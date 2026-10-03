import {
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  Group,
  BoxGeometry,
  MeshBasicMaterial,
  Texture,
  Vector3,
  Mesh,
  Raycaster,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineLoop,
  LineSegments,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  type Intersection,
  type Object3D,
} from 'three';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type {
  FacilityBuildingModelOutput,
  FacilityModelOutput,
} from '@features/organization/features/facilities/models';
import { FacilityBuilding3dScene } from '../facility-building-3d-scene.component';

const graphics = vi.hoisted(() => ({
  render: vi.fn(),
  dispose: vi.fn(),
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  controlsDispose: vi.fn(),
  controlsUpdate: vi.fn(),
  controlsChanged: null as (() => void) | null,
  materialProperties: vi.fn(),
}));

// Keep real geometry, materials and picking. Only the browser GPU and controls
// are substituted: jsdom cannot create a WebGL context.
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  /**
   * Class RendererStub
   * @description Captures GPU boundary calls while retaining real Three scene objects.
   * @since 1.0.0
   */
  class RendererStub {
    public readonly render = graphics.render;
    public readonly dispose = graphics.dispose;
    public readonly setSize = graphics.setSize;
    public readonly setPixelRatio = graphics.setPixelRatio;
    public readonly properties = { get: graphics.materialProperties };
  }
  return { ...actual, WebGLRenderer: RendererStub };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', async () => {
  const { Vector3: ControlVector3 } = await import('three');
  /**
   * Class ControlsStub
   * @description Exposes the camera controls' change and disposal boundary.
   * @since 1.0.0
   */
  class ControlsStub {
    public enableDamping = false;
    public readonly target = new ControlVector3();
    public readonly update = graphics.controlsUpdate;
    public readonly dispose = graphics.controlsDispose;
    public addEventListener(_type: string, callback: () => void): void {
      graphics.controlsChanged = callback;
    }
  }
  return { OrbitControls: ControlsStub };
});

const MODEL: FacilityBuildingModelOutput = {
  buildingId: 'building-1',
  buildingName: 'North building',
  floors: [0, 1].map((level) => ({
    facilityId: `floor-${level}`,
    name: `Level ${level}`,
    levelIndex: level,
    elevationMeters: null,
    heightMeters: null,
    equipment: [],
    hierarchyIssues: [],
    diagnostics: { invalidGeometryCount: 0, unpositionedEquipmentCount: 0, geometryIssues: [] },
    status: 'active',
    plan: { attachmentId: `plan-${level}`, imageWidth: 1000, imageHeight: 500, calibration: null },
    outline: {
      source: 'plan_geometry',
      points: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    },
    rooms: [
      {
        facilityId: `room-${level}`,
        name: `Room ${level}`,
        type: 'zone',
        status: 'active',
        points: [
          [0.1, 0.1],
          [0.8, 0.1],
          [0.8, 0.8],
          [0.1, 0.8],
        ],
      },
    ],
  })),
};

const IMPORTED_MODEL: FacilityModelOutput = {
  '@id': '/api/facility-models/model-1',
  '@type': 'FacilityModel',
  id: 'model-1',
  organizationId: 'org-1',
  buildingId: MODEL.buildingId,
  fileName: 'building.glb',
  mimeType: 'model/gltf-binary',
  fileSize: 100,
  nodeCount: 2,
  nodes: [
    { index: 0, name: 'Shell' },
    { index: 1, name: 'Assembly' },
  ],
  revision: 1,
  active: true,
  transform: { scale: 1, rotationDegrees: 0, translation: { x: 0, y: 0, z: 0 } },
  bindings: [{ nodeIndex: 1, facilityId: 'floor-0' }],
  bindingIssues: [],
  downloadUrl: '/api/facility-models/model-1/download',
  createdAt: '',
  updatedAt: '',
};

/**
 * Function sceneObject
 * @description Requires the object created by the asynchronous scene mount before asserting its behavior.
 * @access private
 * @since 1.0.0
 * @template T
 * @param {T | null | undefined} value - Scene object under test.
 * @returns {T} The mounted scene object.
 */
function sceneObject<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected a mounted scene object.');
  return value;
}

/**
 * Function hit
 * @description Builds a ray intersection for a real scene object at the picking boundary.
 * @access private
 * @since 1.0.0
 * @param {Object3D} object - Hit object.
 * @returns {Intersection} Intersection provided by the raycaster stub.
 */
function hit(object: Object3D): Intersection {
  return { object, distance: 1, point: object.position };
}

describe('FacilityBuilding3dScene', () => {
  let fixture: ComponentFixture<FacilityBuilding3dScene>;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let resize: ResizeObserverCallback;
  let disconnect: ReturnType<typeof vi.fn<() => void>>;
  let observe: ReturnType<typeof vi.fn<(element: Element) => void>>;
  let theme: ThemePort;
  let resolvedTheme: WritableSignal<'light' | 'dark'>;

  /**
   * Function mount
   * @description Waits for the real asynchronous import and initial scene composition.
   * @returns {Promise<HTMLCanvasElement>} Mounted canvas after its rendering state is ready.
   */
  async function mount(): Promise<HTMLCanvasElement> {
    fixture = TestBed.createComponent(FacilityBuilding3dScene);
    fixture.componentRef.setInput('model', MODEL);
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(fixture.componentInstance['ready']()).toBe(true);
    });
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 400));
    return canvas;
  }

  /**
   * Function frame
   * @description Runs a single browser animation frame; callbacks scheduled inside it remain pending.
   * @param {number} time - Timestamp passed to the pending callbacks.
   * @returns {void}
   */
  function frame(time = performance.now()): void {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(time);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    graphics.materialProperties.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    frames = new Map();
    nextFrame = 0;
    disconnect = vi.fn<() => void>();
    observe = vi.fn<(element: Element) => void>();
    graphics.controlsChanged = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
      frames.delete(id);
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    vi.stubGlobal('devicePixelRatio', 4);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        public constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        public readonly observe = observe;
        public readonly disconnect = disconnect;
      },
    );
    resolvedTheme = signal<'light' | 'dark'>('light');
    theme = {
      theme: signal('light'),
      resolvedTheme,
      setTheme: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: THEME_PORT, useValue: theme },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([false, true])(
    'reconciles GLB inputs changed during mount without rebuilding unchanged inputs (changed: %s)',
    async (changed) => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new MeshBasicMaterial();
      const source = new Group();
      const mesh = new Mesh(geometry, material);
      mesh.userData = { facilityModelNodeIndex: 0 };
      source.add(mesh);
      const sourceDispose = vi.spyOn(geometry, 'dispose');
      const sourceMaterialDispose = vi.spyOn(material, 'dispose');
      const oldGeometryDisposed = vi.fn();
      graphics.controlsUpdate.mockImplementationOnce(() => {
        fixture.componentInstance['roomMeshes']
          .get('room-0')
          ?.geometry.addEventListener('dispose', oldGeometryDisposed);
        if (changed) {
          fixture.componentRef.setInput('model', { ...MODEL, floors: [] });
          fixture.componentRef.setInput('facilityFloorIds', { 'floor-0': 'floor-0' });
          fixture.componentRef.setInput('importedModel', {
            ...IMPORTED_MODEL,
            bindings: [{ nodeIndex: 0, facilityId: 'floor-0' }],
          });
          fixture.componentRef.setInput('importedModelAsset', { scene: source, nodes: [] });
        }
      });
      await mount();
      const scene = fixture.componentInstance;
      expect(oldGeometryDisposed).toHaveBeenCalledTimes(changed ? 1 : 0);
      if (changed) {
        expect(scene['floorGroups'].size).toBe(0);
        expect(scene['roomMeshes'].size).toBe(0);
        const rendered: Mesh[] = [];
        scene['importedGroup']?.traverse((object) => {
          if ((object as Mesh).isMesh) rendered.push(object as Mesh);
        });
        const clone = sceneObject(rendered[0]);
        expect(clone.geometry).not.toBe(geometry);
        expect(clone.userData['facilityId']).toBe('floor-0');
        const cloneDispose = vi.spyOn(clone.geometry, 'dispose');
        fixture.destroy();
        expect(cloneDispose).toHaveBeenCalledOnce();
      } else {
        expect(scene['importedGroup']).toBeNull();
        expect(scene['floorGroups'].size).toBe(2);
      }
      expect(sourceDispose).not.toHaveBeenCalled();
      expect(sourceMaterialDispose).not.toHaveBeenCalled();
    },
  );

  it('coalesces renders, bounds pixel density and resizes only visible containers', async () => {
    await mount();
    expect(graphics.setPixelRatio).toHaveBeenCalledWith(2);
    frame();
    graphics.render.mockClear();
    graphics.controlsChanged?.();
    graphics.controlsChanged?.();
    expect(frames.size).toBe(1);
    frame();
    expect(graphics.render).toHaveBeenCalledTimes(1);
    const container = observe.mock.calls[0][0];
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 400 },
    });
    resize([], {} as ResizeObserver);
    expect(graphics.setSize).toHaveBeenLastCalledWith(800, 400, false);
    expect(fixture.componentInstance['camera']?.aspect).toBe(2);
    graphics.setSize.mockClear();
    Object.defineProperty(container, 'clientHeight', { value: 0 });
    resize([], {} as ResizeObserver);
    expect(graphics.setSize).not.toHaveBeenCalled();
  });

  it('adds a non-color selection outline, hides other floors and disposes replaced outlines', async () => {
    await mount();
    fixture.componentRef.setInput('selectedRoomId', 'room-0');
    fixture.componentRef.setInput('selectedFloorId', 'floor-0');
    fixture.componentRef.setInput('isolatedFloorId', 'floor-0');
    await fixture.whenStable();
    const scene = fixture.componentInstance;
    const outline = scene['selectedRoomOutline'];
    expect(outline?.parent).toBe(scene['roomMeshes'].get('room-0')?.parent);
    expect(outline?.renderOrder).toBe(1);
    expect(scene['selectedFloorOutline']).not.toBeNull();
    expect(scene['floorGroups'].get('floor-1')?.group.visible).toBe(false);
    const disposed = vi.spyOn(sceneObject(outline).geometry, 'dispose');
    fixture.componentRef.setInput('selectedRoomId', null);
    fixture.componentRef.setInput('selectedFloorId', null);
    fixture.componentRef.setInput('isolatedFloorId', null);
    await fixture.whenStable();
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(outline?.parent).toBeNull();
    expect(scene['floorGroups'].get('floor-1')?.group.visible).toBe(true);
  });

  it('rebuilds the palette on theme changes while retaining the active room and floor isolation', async () => {
    await mount();
    const scene = fixture.componentInstance;
    fixture.componentRef.setInput('selectedRoomId', 'room-0');
    fixture.componentRef.setInput('isolatedFloorId', 'floor-0');
    await fixture.whenStable();
    const previousRoom = sceneObject(scene['roomMeshes'].get('room-0'));
    const disposed = vi.spyOn(previousRoom.geometry, 'dispose');

    resolvedTheme.set('dark');
    await fixture.whenStable();

    expect(disposed).toHaveBeenCalledTimes(1);
    expect(scene['roomMeshes'].get('room-0')).not.toBe(previousRoom);
    expect(scene['selectedRoomOutline']?.parent).toBe(scene['roomMeshes'].get('room-0')?.parent);
    expect(scene['floorGroups'].get('floor-1')?.group.visible).toBe(false);
  });

  it('finishes a bounded exploded-layout animation and resets the camera on demand', async () => {
    await mount();
    frame();
    const scene = fixture.componentInstance;
    fixture.componentRef.setInput('exploded', true);
    await fixture.whenStable();
    frame(performance.now() + 500);
    frame();
    expect(scene['floorGroups'].get('floor-1')?.group.position.y).toBe(2);
    expect(frames.size).toBe(0);
    fixture.componentRef.setInput('exploded', false);
    await fixture.whenStable();
    frame(performance.now() + 500);
    frame();
    expect(scene['floorGroups'].get('floor-1')?.group.position.y).toBe(1);
    graphics.controlsUpdate.mockClear();
    fixture.componentRef.setInput('cameraResetToken', 1);
    await fixture.whenStable();
    expect(graphics.controlsUpdate).toHaveBeenCalledTimes(1);
    expect(scene['camera']?.far).toBeGreaterThan(scene['camera']?.near ?? 0);
  });

  it('applies reduced motion without scheduling a tween', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    await mount();
    frame();
    fixture.componentRef.setInput('exploded', true);
    await fixture.whenStable();
    expect(fixture.componentInstance['floorGroups'].get('floor-1')?.group.position.y).toBe(2);
    expect(fixture.componentInstance['explodeRaf']).toBeNull();
    frame();
    expect(frames.size).toBe(0);
  });

  it('distinguishes taps, orbit drags, floor activation and background activation', async () => {
    const canvas = await mount();
    const scene = fixture.componentInstance;
    const roomActivated = vi.fn();
    const floorActivated = vi.fn();
    const backgroundActivated = vi.fn();
    scene.roomActivated.subscribe(roomActivated);
    scene.floorActivated.subscribe(floorActivated);
    scene.backgroundActivated.subscribe(backgroundActivated);
    const raycast = vi.spyOn(sceneObject(scene['raycaster']), 'intersectObjects');
    raycast.mockReturnValue([hit(sceneObject(scene['roomMeshes'].get('room-0')))]);
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 10 }));
    canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 12, clientY: 12 }));
    expect(roomActivated).toHaveBeenCalledExactlyOnceWith('room-0');
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 10 }));
    canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 100, clientY: 100 }));
    expect(raycast).toHaveBeenCalledTimes(1);
    raycast.mockReturnValue([hit(sceneObject(scene['slabMeshes'].get('floor-1')))]);
    canvas.dispatchEvent(new MouseEvent('pointerdown'));
    canvas.dispatchEvent(new MouseEvent('pointerup'));
    expect(floorActivated).toHaveBeenCalledExactlyOnceWith('floor-1');
    raycast.mockReturnValue([]);
    canvas.dispatchEvent(new MouseEvent('pointerdown'));
    canvas.dispatchEvent(new MouseEvent('pointerup'));
    expect(backgroundActivated).toHaveBeenCalledTimes(1);
  });

  it('excludes a non-isolated floor from activation until isolation is cleared', async () => {
    const canvas = await mount();
    const scene = fixture.componentInstance;
    const roomActivated = vi.fn();
    const backgroundActivated = vi.fn();
    scene.roomActivated.subscribe(roomActivated);
    scene.backgroundActivated.subscribe(backgroundActivated);
    const raycast = vi
      .spyOn(sceneObject(scene['raycaster']), 'intersectObjects')
      .mockReturnValue([hit(sceneObject(scene['roomMeshes'].get('room-1')))]);

    fixture.componentRef.setInput('isolatedFloorId', 'floor-0');
    await fixture.whenStable();
    canvas.dispatchEvent(new MouseEvent('pointerdown'));
    canvas.dispatchEvent(new MouseEvent('pointerup'));
    expect(backgroundActivated).toHaveBeenCalledOnce();
    expect(roomActivated).not.toHaveBeenCalled();

    fixture.componentRef.setInput('isolatedFloorId', null);
    await fixture.whenStable();
    raycast.mockReturnValue([hit(sceneObject(scene['roomMeshes'].get('room-1')))]);
    canvas.dispatchEvent(new MouseEvent('pointerdown'));
    canvas.dispatchEvent(new MouseEvent('pointerup'));
    expect(roomActivated).toHaveBeenCalledExactlyOnceWith('room-1');
  });

  it('coalesces hover raycasts and emits only changed room identities', async () => {
    const canvas = await mount();
    frame();
    const scene = fixture.componentInstance;
    const hovered = vi.fn();
    scene.roomHovered.subscribe(hovered);
    const room = sceneObject(scene['roomMeshes'].get('room-0'));
    const raycast = vi
      .spyOn(sceneObject(scene['raycaster']), 'intersectObjects')
      .mockReturnValue([{ object: room, distance: 1, point: room.position }]);
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 10 }));
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 20 }));
    frame();
    expect(raycast).toHaveBeenCalledTimes(1);
    expect(hovered).toHaveBeenCalledExactlyOnceWith('room-0');
    expect(canvas.style.cursor).toBe('pointer');
    canvas.dispatchEvent(new MouseEvent('pointermove'));
    frame();
    expect(hovered).toHaveBeenCalledTimes(1);
    raycast.mockReturnValue([]);
    canvas.dispatchEvent(new MouseEvent('pointermove'));
    frame();
    expect(hovered).toHaveBeenLastCalledWith(null);
    expect(canvas.style.cursor).toBe('');
  });

  it('rebuilds geometry on model changes and frees shared resources once on context loss', async () => {
    const canvas = await mount();
    const scene = fixture.componentInstance;
    const original = sceneObject(scene['roomMeshes'].get('room-0'));
    const oldGeometryDisposed = vi.spyOn(original.geometry, 'dispose');
    fixture.componentRef.setInput('model', {
      ...MODEL,
      buildingName: 'Updated building',
      floors: [MODEL.floors[0]],
    });
    await fixture.whenStable();
    expect(oldGeometryDisposed).toHaveBeenCalledTimes(1);
    expect(scene['floorGroups'].size).toBe(1);
    expect(canvas.getAttribute('aria-label')).toContain('Updated building');
    const mesh = sceneObject(scene['roomMeshes'].get('room-0'));
    const duplicate = new Mesh(mesh.geometry, mesh.material);
    scene['buildingGroup']?.add(duplicate);
    const geometryDisposed = vi.spyOn(mesh.geometry, 'dispose');
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const materialDisposed = vi.spyOn(material, 'dispose');
    const unavailable = vi.fn();
    scene.renderingUnavailable.subscribe(unavailable);
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect(scene['ready']()).toBe(false);
    expect(scene['renderRaf']).toBeNull();
    expect(scene['hoverRaf']).toBeNull();
    expect(scene['explodeRaf']).toBeNull();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(geometryDisposed).toHaveBeenCalledTimes(1);
    expect(materialDisposed).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(graphics.dispose).toHaveBeenCalledTimes(1);
    expect(graphics.controlsDispose).toHaveBeenCalledTimes(1);
  });

  it('keeps an empty building renderable without trying to frame missing geometry', async () => {
    const canvas = await mount();
    const scene = fixture.componentInstance;
    fixture.componentRef.setInput('model', { ...MODEL, floors: [] });
    await fixture.whenStable();
    expect(scene['floorGroups'].size).toBe(0);
    expect(canvas.getAttribute('aria-label')).toContain('0 floor(s)');

    graphics.controlsUpdate.mockClear();
    fixture.componentRef.setInput('cameraResetToken', 1);
    await fixture.whenStable();
    expect(graphics.controlsUpdate).not.toHaveBeenCalled();
    expect(scene['ready']()).toBe(true);
  });

  it('releases the renderer PBR lookup texture once before destroying its properties cache', async () => {
    await mount();
    const lookup = new Texture();
    lookup.name = 'DFG_LUT';
    graphics.materialProperties.mockReturnValue({ uniforms: { dfgLUT: { value: lookup } } });
    const disposed = vi.spyOn(lookup, 'dispose');
    fixture.destroy();

    expect(disposed).toHaveBeenCalledTimes(1);
    expect(disposed.mock.invocationCallOrder[0]).toBeLessThan(
      graphics.dispose.mock.invocationCallOrder[0],
    );
  });
  it('frames the visible content using the narrower portrait field of view', async () => {
    await mount();
    const scene = fixture.componentInstance;
    const container = observe.mock.calls[0][0];
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 400 },
    });
    resize([], {} as ResizeObserver);
    const landscape = sceneObject(scene['camera']).position.distanceTo(
      sceneObject(scene['controls']).target,
    );
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 400 },
      clientHeight: { configurable: true, value: 800 },
    });
    resize([], {} as ResizeObserver);
    const portrait = sceneObject(scene['camera']).position.distanceTo(
      sceneObject(scene['controls']).target,
    );
    expect(portrait).toBeGreaterThan(landscape);
    expect(scene['camera']?.aspect).toBe(0.5);
    fixture.componentRef.setInput('isolatedFloorId', 'floor-0');
    await fixture.whenStable();
    expect(
      sceneObject(scene['camera']).position.distanceTo(sceneObject(scene['controls']).target),
    ).toBeLessThan(portrait);
  });

  it('transforms non-square plans uniformly in metric space and omits incomplete floors', async () => {
    await mount();
    const floor = MODEL.floors[0];
    fixture.componentRef.setInput('model', {
      ...MODEL,
      floors: [
        {
          ...floor,
          elevationMeters: -3,
          heightMeters: 3,
          plan: {
            ...floor.plan,
            calibration: {
              widthMeters: 20,
              rotationDegrees: 90,
              offsetXMeters: 2,
              offsetZMeters: 4,
            },
          },
        },
        MODEL.floors[1],
      ],
    });
    fixture.componentRef.setInput('metric', true);
    await fixture.whenStable();
    const scene = fixture.componentInstance;
    expect([...scene['floorGroups'].keys()]).toEqual(['floor-0']);
    const group = sceneObject(scene['floorGroups'].get('floor-0')).group;
    group.updateWorldMatrix(true, true);
    const world = group.localToWorld(new Vector3(1, 0, 0.75));
    expect(world.x).toBeCloseTo(9.5);
    expect(world.y).toBe(-3);
    expect(world.z).toBeCloseTo(-6);
    expect(MODEL.floors[0].rooms[0].points[0]).toEqual([0.1, 0.1]);
    fixture.componentRef.setInput('model', {
      ...MODEL,
      floors: [
        {
          ...floor,
          elevationMeters: -3,
          heightMeters: 3,
          plan: {
            attachmentId: 'plan-0',
            imageWidth: 1000,
            imageHeight: 500,
            calibration: {
              widthMeters: 20,
              rotationDegrees: 90,
              offsetXMeters: 2,
              offsetZMeters: 4,
            },
            calibrationBuildingId: 'former-building',
            calibrationIssue: 'building_changed',
          },
        },
      ],
    });
    await fixture.whenStable();
    expect(scene['floorGroups'].size).toBe(0);
  });

  it('keeps equipment markers visible across contour lines while respecting solid occlusion', async () => {
    await mount();
    const scene = fixture.componentInstance;
    fixture.componentRef.setInput('model', {
      ...MODEL,
      floors: [
        {
          ...MODEL.floors[0],
          equipment: [
            {
              equipmentId: 'equipment-1',
              facilityId: 'room-0',
              type: 'fire_extinguisher',
              status: 'active',
              serialNumber: 'EXT-1',
              locationLabel: null,
              position: { attachmentId: 'plan-0', x: 0.5, y: 0.5 },
              placementIssue: null,
            },
          ],
        },
      ],
    });
    await fixture.whenStable();
    // Real OrbitControls aims the camera at its target during update; the controls boundary stub
    // deliberately leaves Three's camera orientation to this projection assertion.
    sceneObject(scene['camera']).lookAt(sceneObject(scene['controls']).target);
    const floorGroup = sceneObject(scene['floorGroups'].get('floor-0')).group;
    const edges = sceneObject(floorGroup.children.find((child) => child.type === 'LineSegments'));
    const room = sceneObject(scene['roomMeshes'].get('room-0'));
    const raycast = vi.spyOn(Raycaster.prototype, 'intersectObjects');
    raycast.mockReturnValue([
      { ...hit(edges), distance: 0.01 },
      { ...hit(room), distance: 1000 },
    ]);
    frame();
    await fixture.whenStable();
    expect(scene['equipmentMarkers']()).toHaveLength(1);
    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-equipment-marker"]'),
    ).not.toBeNull();

    raycast.mockReturnValue([{ ...hit(room), distance: 0.01 }]);
    graphics.controlsChanged?.();
    frame();
    await fixture.whenStable();
    expect(scene['equipmentMarkers']()).toEqual([]);
  });

  it('clones imported GPU resources, preserves indexed picking and never disposes store assets', async () => {
    const canvas = await mount();
    const source = new Group();
    source.userData = { facilityModelNodeIndex: 1 };
    const geometry = new BoxGeometry(2, 2, 2);
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const mesh = new Mesh(geometry, material);
    mesh.userData = { facilityModelNodeIndex: 0 };
    source.add(mesh);
    const model: FacilityModelOutput = {
      '@id': '/api/facility-models/model-1',
      '@type': 'FacilityModel',
      id: 'model-1',
      organizationId: 'org-1',
      buildingId: MODEL.buildingId,
      fileName: 'building.glb',
      mimeType: 'model/gltf-binary',
      fileSize: 100,
      nodeCount: 2,
      nodes: [
        { index: 0, name: 'Shell' },
        { index: 1, name: 'Assembly' },
      ],
      revision: 1,
      active: true,
      transform: { scale: 2, rotationDegrees: 30, translation: { x: 5, y: -1, z: 4 } },
      bindings: [{ nodeIndex: 1, facilityId: 'floor-0' }],
      bindingIssues: [],
      downloadUrl: '/api/facility-models/model-1/download',
      createdAt: '',
      updatedAt: '',
    };
    fixture.componentRef.setInput('model', { ...MODEL, floors: [] });
    fixture.componentRef.setInput('facilityFloorIds', { 'floor-0': 'floor-0' });
    fixture.componentRef.setInput('importedModel', model);
    fixture.componentRef.setInput('importedModelAsset', {
      scene: source,
      nodes: [
        { index: 0, name: 'Shell', objects: [mesh] },
        { index: 1, name: 'Assembly', objects: [source] },
      ],
    });
    await fixture.whenStable();
    const scene = fixture.componentInstance;
    const rendered: Mesh[] = [];
    scene['importedGroup']?.traverse((object) => {
      if ((object as Mesh).isMesh) rendered.push(object as Mesh);
    });
    const own = sceneObject(rendered[0]);
    expect(own.geometry).not.toBe(geometry);
    expect(own.material).not.toBe(material);
    expect((own.material as MeshBasicMaterial).map).not.toBe(texture);
    expect(own.userData['nodePath']).toEqual([0, 1]);
    expect(own.userData['facilityId']).toBe('floor-0');
    expect(scene['importedGroup']?.position.x).toBe(5);
    expect(scene['importedSelectionOutlines']).toHaveLength(0);
    fixture.componentRef.setInput('selectedNodeIndex', 1);
    await fixture.whenStable();
    expect(scene['importedSelectionOutlines']).toHaveLength(1);
    own.userData['facilityId'] = null;
    fixture.componentRef.setInput('selectedNodeIndex', null);
    await fixture.whenStable();
    expect(scene['importedSelectionOutlines']).toHaveLength(0);
    const activated = vi.fn();
    scene.importedNodeSelected.subscribe(activated);
    vi.spyOn(sceneObject(scene['raycaster']), 'intersectObjects').mockReturnValue([hit(own)]);
    canvas.dispatchEvent(new MouseEvent('pointerdown'));
    canvas.dispatchEvent(new MouseEvent('pointerup'));
    expect(activated).toHaveBeenCalledExactlyOnceWith(0);
    const sourceDispose = vi.spyOn(geometry, 'dispose');
    const sourceTextureDispose = vi.spyOn(texture, 'dispose');
    const cloneDispose = vi.spyOn(own.geometry, 'dispose');
    fixture.componentRef.setInput('importedModel', {
      ...model,
      bindingIssues: [{ nodeIndex: 0, code: 'target_unavailable' }],
    });
    fixture.componentRef.setInput('selectedNodeIndex', 0);
    fixture.componentRef.setInput('selectedFloorId', 'floor-0');
    fixture.componentRef.setInput('isolatedFloorId', 'floor-1');
    await fixture.whenStable();
    const neutral: Mesh[] = [];
    scene['importedGroup']?.traverse((object) => {
      if ((object as Mesh).isMesh) neutral.push(object as Mesh);
    });
    expect(neutral[0].userData['facilityId']).toBeNull();
    expect(neutral[0].userData['bindingUnavailable']).toBe(true);
    expect(neutral[0].visible).toBe(true);
    expect(scene['importedSelectionOutlines']).toHaveLength(0);
    fixture.destroy();
    expect(cloneDispose).toHaveBeenCalledTimes(1);
    expect(sourceDispose).not.toHaveBeenCalled();
    expect(sourceTextureDispose).not.toHaveBeenCalled();
  });

  it.each(['Line', 'LineLoop', 'LineSegments', 'Points'] as const)(
    'owns %s resources, picks undrawn bindings and isolates them by their nearest floor',
    async (kind) => {
      const canvas = await mount();
      const source = new Group();
      source.userData = { facilityModelNodeIndex: 1 };
      const geometry = new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute(kind === 'Points' ? [6, 5, 4] : [0, 0, 0, 2, 1, 0, 2, 1, 2], 3),
      );
      const texture = new Texture();
      const material =
        kind === 'Points'
          ? new PointsMaterial({ map: texture, size: 2, sizeAttenuation: false })
          : new LineBasicMaterial();
      const primitive =
        kind === 'Points'
          ? new Points(geometry, material)
          : kind === 'LineLoop'
            ? new LineLoop(geometry, material)
            : kind === 'LineSegments'
              ? new LineSegments(geometry, material)
              : new Line(geometry, material);
      primitive.userData = { facilityModelNodeIndex: 0 };
      source.add(primitive, primitive.clone());
      const sourceGeometryDispose = vi.spyOn(geometry, 'dispose');
      const sourceMaterialDispose = vi.spyOn(material, 'dispose');
      const sourceTextureDispose = vi.spyOn(texture, 'dispose');
      fixture.componentRef.setInput('model', {
        ...MODEL,
        floors: MODEL.floors.map((floor) => ({ ...floor, rooms: [] })),
      });
      fixture.componentRef.setInput('facilityFloorIds', {
        'undrawn-zone': 'floor-0',
        'floor-1': 'floor-1',
      });
      const importedModel = {
        ...IMPORTED_MODEL,
        bindings: [
          { nodeIndex: 0, facilityId: 'undrawn-zone' },
          { nodeIndex: 1, facilityId: 'floor-1' },
        ],
      };
      fixture.componentRef.setInput('importedModel', importedModel);
      fixture.componentRef.setInput('importedModelAsset', { scene: source, nodes: [] });
      await fixture.whenStable();
      const scene = fixture.componentInstance;
      const primitives: (Line | Points)[] = [];
      scene['importedGroup']?.traverse((object) => {
        if (object.userData['kind'] === 'imported-node') primitives.push(object as Line | Points);
      });
      const own = sceneObject(primitives[0]);
      const ownMaterial = Array.isArray(own.material) ? own.material[0] : own.material;
      expect(own.geometry).not.toBe(geometry);
      expect(ownMaterial).not.toBe(material);
      expect(primitives[1].geometry).toBe(own.geometry);
      expect(primitives[1].material).toBe(own.material);
      expect(own.userData['nodePath']).toEqual([0, 1]);
      expect(own.userData['facilityId']).toBe('undrawn-zone');
      if (kind === 'Points') expect((ownMaterial as PointsMaterial).map).not.toBe(texture);
      expect(scene['controls']?.target.length()).toBeGreaterThan(0);
      const ownGeometryDispose = vi.spyOn(own.geometry, 'dispose');
      const ownMaterialDispose = vi.spyOn(ownMaterial, 'dispose');
      const ownTextureDispose =
        kind === 'Points'
          ? vi.spyOn(sceneObject((ownMaterial as PointsMaterial).map), 'dispose')
          : null;

      const activated = vi.fn();
      scene.importedNodeSelected.subscribe(activated);
      const raycast = vi.spyOn(sceneObject(scene['raycaster']), 'intersectObjects');
      raycast.mockReturnValue([hit(own)]);
      const camera = sceneObject(scene['camera']);
      camera.lookAt(sceneObject(scene['controls']).target);
      camera.updateMatrixWorld();
      own.updateWorldMatrix(true, false);
      const point = new Vector3()
        .fromBufferAttribute(own.geometry.getAttribute('position'), 0)
        .applyMatrix4(own.matrixWorld)
        .project(camera);
      const pointer = { clientX: ((point.x + 1) * 800) / 2, clientY: ((1 - point.y) * 400) / 2 };
      canvas.dispatchEvent(new MouseEvent('pointerdown', pointer));
      canvas.dispatchEvent(new MouseEvent('pointerup', pointer));
      expect(activated).toHaveBeenCalledExactlyOnceWith(0);

      fixture.componentRef.setInput('selectedFacilityId', 'undrawn-zone');
      await fixture.whenStable();
      expect(scene['importedSelectionOutlines']).toHaveLength(2);
      const outline = sceneObject(scene['importedSelectionOutlines'][0]);
      expect(outline.type).toBe(kind);
      expect(outline.geometry).not.toBe(own.geometry);
      const outlineGeometryDispose = vi.spyOn(outline.geometry, 'dispose');
      const outlineMaterial = Array.isArray(outline.material)
        ? outline.material[0]
        : outline.material;
      const outlineMaterialDispose = vi.spyOn(outlineMaterial, 'dispose');
      if (kind === 'Points') {
        expect(own.geometry.getAttribute('position').count).toBe(1);
        expect([...own.geometry.getAttribute('position').array]).toEqual([6, 5, 4]);
        expect((ownMaterial as PointsMaterial).sizeAttenuation).toBe(false);
        expect((outlineMaterial as PointsMaterial).size).toBe(2);
        expect((outlineMaterial as PointsMaterial).sizeAttenuation).toBe(false);
        expect((material as PointsMaterial).sizeAttenuation).toBe(false);
      }
      fixture.componentRef.setInput('isolatedFloorId', 'floor-1');
      await fixture.whenStable();
      expect(own.visible).toBe(false);
      expect(scene['importedSelectionOutlines']).toHaveLength(0);
      expect(outlineGeometryDispose).toHaveBeenCalledOnce();
      expect(outlineMaterialDispose).toHaveBeenCalledOnce();
      canvas.dispatchEvent(new MouseEvent('pointerdown', pointer));
      canvas.dispatchEvent(new MouseEvent('pointerup', pointer));
      expect(activated).toHaveBeenCalledOnce();

      fixture.componentRef.setInput('isolatedFloorId', 'floor-0');
      await fixture.whenStable();
      expect(own.visible).toBe(true);
      expect(scene['importedSelectionOutlines']).toHaveLength(2);
      fixture.componentRef.setInput('importedModel', {
        ...importedModel,
        bindingIssues: [{ nodeIndex: 0, code: 'target_unavailable' }],
      });
      fixture.componentRef.setInput('selectedNodeIndex', 1);
      fixture.componentRef.setInput('isolatedFloorId', 'floor-1');
      await fixture.whenStable();
      const neutral: (Line | Points)[] = [];
      scene['importedGroup']?.traverse((object) => {
        if (object.userData['kind'] === 'imported-node') neutral.push(object as Line | Points);
      });
      expect(neutral[0].userData['facilityId']).toBeNull();
      expect(neutral[0].userData['bindingUnavailable']).toBe(true);
      expect(neutral[0].visible).toBe(true);
      expect(scene['importedSelectionOutlines']).toHaveLength(0);
      expect(ownGeometryDispose).toHaveBeenCalledOnce();
      expect(ownMaterialDispose).toHaveBeenCalledOnce();
      if (ownTextureDispose) expect(ownTextureDispose).toHaveBeenCalledOnce();
      const lastGeometryDispose = vi.spyOn(neutral[0].geometry, 'dispose');
      const lastMaterial = Array.isArray(neutral[0].material)
        ? neutral[0].material[0]
        : neutral[0].material;
      const lastMaterialDispose = vi.spyOn(lastMaterial, 'dispose');
      fixture.destroy();
      expect(lastGeometryDispose).toHaveBeenCalledOnce();
      expect(lastMaterialDispose).toHaveBeenCalledOnce();
      expect(sourceGeometryDispose).not.toHaveBeenCalled();
      expect(sourceMaterialDispose).not.toHaveBeenCalled();
      expect(sourceTextureDispose).not.toHaveBeenCalled();
    },
  );

  it.each(['Points', 'LineSegments'] as const)(
    'picks %s in CSS pixels through zoom and scaled GLB parents while excluding background',
    async (kind) => {
      const canvas = await mount();
      const source = new Group();
      source.scale.set(2, 3, 4);
      const primitive =
        kind === 'Points'
          ? new Points(
              new BufferGeometry().setAttribute(
                'position',
                new Float32BufferAttribute([1, 2, 3], 3),
              ),
              new PointsMaterial({ size: 1, sizeAttenuation: false }),
            )
          : new LineSegments(
              new BufferGeometry().setAttribute(
                'position',
                new Float32BufferAttribute([0, 2, 3, 2, 2, 3], 3),
              ),
              new LineBasicMaterial(),
            );
      primitive.userData = { facilityModelNodeIndex: 0 };
      source.add(primitive);
      fixture.componentRef.setInput('model', { ...MODEL, floors: [] });
      fixture.componentRef.setInput('facilityFloorIds', { 'floor-0': 'floor-0' });
      fixture.componentRef.setInput('importedModel', {
        ...IMPORTED_MODEL,
        transform: { scale: 0.25, rotationDegrees: 35, translation: { x: 5, y: 2, z: -3 } },
        bindings: [{ nodeIndex: 0, facilityId: 'floor-0' }],
      });
      fixture.componentRef.setInput('importedModelAsset', { scene: source, nodes: [] });
      fixture.componentRef.setInput('isolatedFloorId', 'floor-0');
      await fixture.whenStable();
      const scene = fixture.componentInstance;
      const activated = vi.fn();
      const background = vi.fn();
      scene.importedNodeSelected.subscribe(activated);
      scene.backgroundActivated.subscribe(background);
      const camera = sceneObject(scene['camera']);
      camera.aspect = 2;
      camera.updateProjectionMatrix();
      const target = sceneObject(scene['controls']).target.clone();
      const cameraOffset = camera.position.clone().sub(target);
      for (const zoom of [0.25, 1, 4]) {
        camera.position.copy(target).addScaledVector(cameraOffset, zoom);
        camera.lookAt(target);
        camera.updateMatrixWorld();
        activated.mockClear();
        background.mockClear();
        canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 200 }));
        canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 400, clientY: 200 }));
        expect(activated).toHaveBeenCalledExactlyOnceWith(0);
        canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 12, clientY: 12 }));
        canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 12, clientY: 12 }));
        expect(activated).toHaveBeenCalledOnce();
        expect(background).toHaveBeenCalledOnce();
      }
      if (kind === 'Points') {
        camera.position.copy(target).add(cameraOffset);
        camera.lookAt(target);
        camera.updateMatrixWorld();
        const cover = new Mesh(new BoxGeometry(0.025, 0.025, 0.025), new MeshBasicMaterial());
        cover.position.copy(target).addScaledVector(cameraOffset, 0.5);
        cover.userData = {
          kind: 'imported-node',
          nodeIndex: 1,
          nodePath: [1],
          facilityId: null,
          bindingUnavailable: false,
        };
        scene['buildingGroup']?.add(cover);
        activated.mockClear();
        canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 200 }));
        canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 400, clientY: 200 }));
        expect(activated).toHaveBeenCalledExactlyOnceWith(1);
        cover.visible = false;
        camera.lookAt(camera.position.clone().add(cameraOffset));
        background.mockClear();
        canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 200 }));
        canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 400, clientY: 200 }));
        expect(background).toHaveBeenCalledOnce();
        expect(activated).toHaveBeenCalledOnce();
      }
      expect([...primitive.geometry.getAttribute('position').array]).toEqual(
        kind === 'Points' ? [1, 2, 3] : [0, 2, 3, 2, 2, 3],
      );
    },
  );

  it.each([
    { kind: 'Points', depths: [0.5], selectable: false },
    { kind: 'Points', depths: [2], selectable: true },
    { kind: 'Points', depths: [20], selectable: false },
    { kind: 'LineSegments', depths: [0.5, 2], selectable: true },
    { kind: 'LineSegments', depths: [20, 2], selectable: true },
    { kind: 'LineSegments', depths: [0.2, 0.5], selectable: false },
    { kind: 'LineSegments', depths: [20, 30], selectable: false },
  ])(
    'respects near/far clipping for $kind at depths $depths',
    async ({ kind, depths, selectable }) => {
      const canvas = await mount();
      const source = new Group();
      const geometry = new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute(
          depths.flatMap((depth) => [0, 0, -depth]),
          3,
        ),
      );
      const primitive =
        kind === 'Points'
          ? new Points(geometry, new PointsMaterial({ size: 1, sizeAttenuation: false }))
          : new LineSegments(geometry, new LineBasicMaterial());
      primitive.userData = { facilityModelNodeIndex: 0 };
      source.add(primitive);
      fixture.componentRef.setInput('model', { ...MODEL, floors: [] });
      fixture.componentRef.setInput('importedModel', { ...IMPORTED_MODEL, bindings: [] });
      fixture.componentRef.setInput('importedModelAsset', { scene: source, nodes: [] });
      await fixture.whenStable();
      const scene = fixture.componentInstance;
      const camera = sceneObject(scene['camera']);
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, -1);
      camera.near = 1;
      camera.far = 10;
      camera.aspect = 2;
      camera.updateProjectionMatrix();
      const activated = vi.fn();
      const background = vi.fn();
      scene.importedNodeSelected.subscribe(activated);
      scene.backgroundActivated.subscribe(background);
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 200 }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 400, clientY: 200 }));
      expect(activated).toHaveBeenCalledTimes(selectable ? 1 : 0);
      if (selectable) expect(activated).toHaveBeenCalledWith(0);
      expect(background).toHaveBeenCalledTimes(selectable ? 0 : 1);
      expect([...geometry.getAttribute('position').array]).toEqual(
        depths.flatMap((depth) => [0, 0, -depth]).map(Math.fround),
      );
    },
  );

  it('retains calibrated marker frames when an exploded generated scene switches to a GLB', async () => {
    await mount();
    fixture.componentRef.setInput('model', {
      ...MODEL,
      floors: MODEL.floors.map((floor, index) =>
        Object.assign({}, floor, {
          elevationMeters: index * 3,
          heightMeters: 3,
          plan: {
            attachmentId: `plan-${index}`,
            imageWidth: 1000,
            imageHeight: 500,
            calibration: {
              widthMeters: 20,
              rotationDegrees: 0,
              offsetXMeters: 0,
              offsetZMeters: 0,
            },
            calibrationBuildingId: MODEL.buildingId,
            calibrationIssue: null,
          },
        }),
      ),
    });
    fixture.componentRef.setInput('metric', true);
    fixture.componentRef.setInput('exploded', true);
    await fixture.whenStable();
    frame(performance.now() + 500);
    const scene = fixture.componentInstance;
    expect(scene['floorGroups'].get('floor-1')?.group.position.y).toBe(4);
    const source = new Group();
    source.add(new Mesh(new BoxGeometry(2, 6, 2), new MeshBasicMaterial()));
    fixture.componentRef.setInput('importedModel', IMPORTED_MODEL);
    fixture.componentRef.setInput('importedModelAsset', { scene: source, nodes: [] });
    await fixture.whenStable();
    frame(performance.now() + 500);
    const floorGroup = sceneObject(scene['floorGroups'].get('floor-1')).group;
    expect(floorGroup.position.y).toBe(3);
    expect(floorGroup.localToWorld(new Vector3(1, 3.08, 0.5)).y).toBeCloseTo(6.08);
    expect(scene['importedGroup']?.position.y).toBe(0);
    expect(scene['explodeRaf']).toBeNull();
    fixture.componentRef.setInput('exploded', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('exploded', true);
    await fixture.whenStable();
    expect(floorGroup.position.y).toBe(3);
    expect(scene['explodeRaf']).toBeNull();
  });
});
