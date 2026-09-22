import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Mesh, type Intersection, type Object3D } from 'three';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { FacilityBuildingModelOutput } from '@features/organization/features/facilities/models';
import { FacilityBuilding3dScene } from '../facility-building-3d-scene.component';

const graphics = vi.hoisted(() => ({
  render: vi.fn(),
  dispose: vi.fn(),
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  controlsDispose: vi.fn(),
  controlsUpdate: vi.fn(),
  controlsChanged: null as (() => void) | null,
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
  }
  return { ...actual, WebGLRenderer: RendererStub };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', async () => {
  const { Vector3 } = await import('three');
  /**
   * Class ControlsStub
   * @description Exposes the camera controls' change and disposal boundary.
   * @since 1.0.0
   */
  class ControlsStub {
    public enableDamping = false;
    public readonly target = new Vector3();
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
    status: 'active',
    plan: { attachmentId: `plan-${level}`, imageWidth: 1000, imageHeight: 500 },
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
    theme = {
      theme: signal('light'),
      resolvedTheme: signal<'light' | 'dark'>('light'),
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

  it('adds a non-color selection outline, dims other floors and disposes replaced outlines', async () => {
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
    const material = scene['roomMeshes'].get('room-1')?.material;
    expect(material).toMatchObject({ transparent: true, opacity: 0.15 });
    const disposed = vi.spyOn(sceneObject(outline).geometry, 'dispose');
    fixture.componentRef.setInput('selectedRoomId', null);
    fixture.componentRef.setInput('selectedFloorId', null);
    fixture.componentRef.setInput('isolatedFloorId', null);
    await fixture.whenStable();
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(outline?.parent).toBeNull();
    expect(material).toMatchObject({ opacity: 1 });
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
});
