import {
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { StoreError } from '@core/request-state';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityBuildingModelFloor,
  FacilityBuildingModelOutput,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import { FacilityBuilding3dStore } from '@features/organization/features/facilities/state';
import { FacilityBuilding3dPage } from '../facility-building-3d-page.component';

/**
 * The page renders `app-facility-building-3d-scene` in its ready branch,
 * which mounts a real `THREE.WebGLRenderer` — unavailable in jsdom. This
 * page spec is not the scene's own boundary test (that lives in the
 * scene's `testing/`), so `three` and `OrbitControls` are faked here just
 * enough for a silent, no-op mount: the fixture's `queryData` stub carries
 * no floors, so none of the geometry-building utils are ever invoked.
 */
vi.mock('three', () => {
  class FakeColor {
    public setStyle = vi.fn();
    public clone = vi.fn(() => new FakeColor());
    public copy = vi.fn();
    public offsetHSL = vi.fn();
  }
  class FakeObject3D {
    public position = { x: 0, y: 0, z: 0, set: vi.fn() };
    public children: FakeObject3D[] = [];
    public userData: Record<string, unknown> = {};
    public add(...objects: FakeObject3D[]): void {
      this.children.push(...objects);
    }
    public remove(...objects: FakeObject3D[]): void {
      for (const object of objects) {
        const index = this.children.indexOf(object);
        if (index >= 0) this.children.splice(index, 1);
      }
    }
    public traverse(callback: (object: FakeObject3D) => void): void {
      callback(this);
      for (const child of this.children) child.traverse(callback);
    }
    public clear(): void {
      this.children = [];
    }
  }
  class FakeGroup extends FakeObject3D {}
  class FakeScene extends FakeObject3D {
    public background: unknown;
  }
  class FakeCamera {
    public aspect = 1;
    public near = 0.1;
    public far = 1000;
    public position = { x: 0, y: 0, z: 0, set: vi.fn() };
    public updateProjectionMatrix = vi.fn();
  }
  class FakeRenderer {
    public setPixelRatio = vi.fn();
    public setSize = vi.fn();
    public render = vi.fn();
    public dispose = vi.fn();
  }
  class FakeRaycaster {
    public setFromCamera = vi.fn();
    public intersectObjects = vi.fn(() => []);
  }
  class FakeVector2 {
    public set = vi.fn();
  }
  class FakeVector3 {
    public x = 0;
    public y = 0;
    public z = 0;
  }
  class FakeBox3 {
    public setFromObject = vi.fn(function (this: FakeBox3): FakeBox3 {
      return this;
    });
    public isEmpty = vi.fn(() => true);
    public hasNoGeometry = vi.fn(() => false);
    public getCenter = vi.fn((vector: FakeVector3) => vector);
    public getSize = vi.fn((vector: FakeVector3) => vector);
  }
  class FakeLight {
    public position = { set: vi.fn() };
  }

  return {
    WebGLRenderer: FakeRenderer,
    Scene: FakeScene,
    Group: FakeGroup,
    PerspectiveCamera: FakeCamera,
    HemisphereLight: FakeLight,
    DirectionalLight: FakeLight,
    Raycaster: FakeRaycaster,
    Vector2: FakeVector2,
    Vector3: FakeVector3,
    Box3: FakeBox3,
    Color: FakeColor,
  };
});

/** jsdom carries no `ResizeObserver` — the scene's mount observes the container with one. */
class FakeResizeObserver {
  public observe = vi.fn();
  public unobserve = vi.fn();
  public disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver);

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => {
  class FakeOrbitControls {
    public enableDamping = false;
    public target = { copy: vi.fn() };
    public addEventListener = vi.fn();
    public update = vi.fn();
    public dispose = vi.fn();
  }
  return { OrbitControls: FakeOrbitControls };
});

const ROOM: FacilityPlanOverlayZone = {
  facilityId: 'room-1',
  name: 'Server room',
  type: 'zone',
  status: 'active',
  points: [],
};

const FLOOR: FacilityBuildingModelFloor = {
  facilityId: 'floor-1',
  name: 'Ground floor',
  levelIndex: 0,
  status: 'active',
  plan: null,
  outline: null,
  rooms: [ROOM],
};

/**
 * Carries no floors, unlike {@link FLOOR}/{@link ROOM} below: it is bound to
 * the scene's own `model` input, and a floor with rooms would push
 * `rebuildBuilding` into real geometry-building code this spec's minimal
 * `three` fake does not cover. `store.floors`/`selectedRoom`/`selectedFloor`
 * are separate, decoupled stubs — this page never derives them from
 * `queryData` itself.
 */
const MODEL: FacilityBuildingModelOutput = {
  buildingId: 'building-1',
  buildingName: 'HQ Tower',
  floors: [],
};

const createStoreStub = (): {
  isQueryLoaded: WritableSignal<boolean>;
  queryHasError: WritableSignal<boolean>;
  queryError: WritableSignal<StoreError | null>;
  queryData: WritableSignal<FacilityBuildingModelOutput | null>;
  isEmpty: WritableSignal<boolean>;
  hasNoGeometry: WritableSignal<boolean>;
  exploded: WritableSignal<boolean>;
  selectedRoomId: WritableSignal<string | null>;
  selectedFloorId: WritableSignal<string | null>;
  isolatedFloorId: WritableSignal<string | null>;
  cameraResetToken: WritableSignal<number>;
  floors: WritableSignal<ReadonlyArray<FacilityBuildingModelFloor>>;
  selectedRoom: WritableSignal<FacilityPlanOverlayZone | null>;
  selectedFloor: WritableSignal<FacilityBuildingModelFloor | null>;
  loadModel: ReturnType<typeof vi.fn>;
  resetCamera: ReturnType<typeof vi.fn>;
  toggleExploded: ReturnType<typeof vi.fn>;
  selectRoom: ReturnType<typeof vi.fn>;
  selectFloor: ReturnType<typeof vi.fn>;
  clearSelection: ReturnType<typeof vi.fn>;
} => ({
  isQueryLoaded: signal<boolean>(false),
  queryHasError: signal<boolean>(false),
  queryError: signal<StoreError | null>(null),
  queryData: signal<FacilityBuildingModelOutput | null>(MODEL),
  isEmpty: signal<boolean>(false),
  hasNoGeometry: signal<boolean>(false),
  exploded: signal<boolean>(false),
  selectedRoomId: signal<string | null>(null),
  selectedFloorId: signal<string | null>(null),
  isolatedFloorId: signal<string | null>(null),
  cameraResetToken: signal<number>(0),
  floors: signal<ReadonlyArray<FacilityBuildingModelFloor>>([FLOOR]),
  selectedRoom: signal<FacilityPlanOverlayZone | null>(null),
  selectedFloor: signal<FacilityBuildingModelFloor | null>(null),
  loadModel: vi.fn(),
  resetCamera: vi.fn(),
  toggleExploded: vi.fn(),
  selectRoom: vi.fn(),
  selectFloor: vi.fn(),
  clearSelection: vi.fn(),
});

const createPage = async (): Promise<ComponentFixture<FacilityBuilding3dPage>> => {
  const created = TestBed.createComponent(FacilityBuilding3dPage);
  created.componentRef.setInput('organizationId', 'org-1');
  created.componentRef.setInput('facilityId', 'facility-1');
  await created.whenStable();

  return created;
};

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('FacilityBuilding3dPage', () => {
  let fixture: ComponentFixture<FacilityBuilding3dPage>;
  let store: ReturnType<typeof createStoreStub>;
  let hasPermission: ReturnType<typeof vi.fn>;

  afterEach(() => {
    // stubMatchMedia replaces a global; left in place it makes every later
    // test in this file think it is running on a narrow viewport.
    vi.unstubAllGlobals();
    // That also clears the module-level ResizeObserver stub jsdom lacks and
    // the scene's mount needs, so put it straight back.
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });

  beforeEach(() => {
    store = createStoreStub();
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: FacilityBuilding3dStore, useValue: store },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal<ThemeMode>('light'),
            resolvedTheme: signal<'light' | 'dark'>('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
      ],
    });
  });

  it('requests the building model for the resolved route params', async () => {
    fixture = await createPage();

    expect(store.loadModel).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('shows the loading skeleton while the model has not resolved', async () => {
    fixture = await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-loading"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="facility-3d-error"]')).toBeNull();
  });

  it('shows the error state with a retry once the model fetch fails', async () => {
    fixture = await createPage();
    store.queryHasError.set(true);
    store.queryError.set({
      error: null,
      message: 'Network error',
      code: 500,
      retryable: true,
      timestamp: Date.now(),
    });
    await fixture.whenStable();

    const errorState = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-error"]',
    ) as HTMLElement;
    expect(errorState).not.toBeNull();

    store.loadModel.mockClear();
    (errorState.querySelector('button') as HTMLButtonElement).click();
    expect(store.loadModel).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('shows the empty state, with the "Go to Plans" action, when the building has no floors', async () => {
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.isEmpty.set(true);
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-empty"]',
    ) as HTMLElement;
    expect(emptyState).not.toBeNull();
    expect(emptyState.querySelector('a')).not.toBeNull();
  });

  it('offers a toolbar control to bring the dismissed compact sheet back', async () => {
    // On a narrow viewport the panel starts closed so the scene is visible on
    // arrival — but the room list is the only keyboard path into the feature,
    // so a real focusable control must lead back to it.
    stubMatchMedia(true);
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({} as RenderingContext);

    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    await fixture.whenStable();

    getContextSpy.mockRestore();

    expect(document.querySelector('hlm-sheet-content')).toBeNull();

    const opener = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-open-room-panel"]',
    ) as HTMLButtonElement;
    expect(opener).not.toBeNull();

    opener.click();
    await fixture.whenStable();

    expect(document.querySelector('hlm-sheet-content')).not.toBeNull();
  });

  it('distinguishes a building whose floors carry no drawn plan from one with no floors', async () => {
    // A very ordinary state: floors are created long before anyone digitizes
    // a plan. Before this branch existed the scene simply rendered an empty
    // canvas with nothing to explain it.
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.isEmpty.set(false);
    store.hasNoGeometry.set(true);
    await fixture.whenStable();

    const noGeometry = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-no-geometry"]',
    ) as HTMLElement;
    expect(noGeometry).not.toBeNull();
    expect(noGeometry.querySelector('a')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="facility-3d-empty"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });

  it('hides the "Go to Plans" action from a read-only member', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.isEmpty.set(true);
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-empty"]',
    ) as HTMLElement;
    expect(emptyState.querySelector('a')).toBeNull();
  });

  it('shows an unsupported-device state when WebGL is unavailable', async () => {
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    fixture.componentInstance['webglSupported'].set(false);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-unsupported"]'),
    ).not.toBeNull();
  });

  it('shows the toolbar wired to the store once the model is ready', async () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({} as RenderingContext);

    fixture = await createPage();
    store.isQueryLoaded.set(true);
    await fixture.whenStable();

    getContextSpy.mockRestore();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="facility-3d-reset-camera"]',
      ) as HTMLButtonElement
    ).click();
    expect(store.resetCamera).toHaveBeenCalled();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="facility-3d-explode-toggle"]',
      ) as HTMLButtonElement
    ).click();
    expect(store.toggleExploded).toHaveBeenCalled();

    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-plan-2d-link"]'),
    ).not.toBeNull();
  });

  it('shows the room panel as soon as a floor is selected — reachable with no prior room selection', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="facility-3d-room-panel"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="facility-3d-floor-selector"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="facility-3d-room-list"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="facility-3d-room-panel-close"]')).toBeNull();
  });

  it('never shows the room panel while no floor is selected', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-room-panel"]'),
    ).toBeNull();
  });

  it('forwards a floor pick from the panel selector to the store', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    store.floors.set([FLOOR, { ...FLOOR, facilityId: 'floor-2', name: 'First floor', rooms: [] }]);
    await fixture.whenStable();

    const options = fixture.nativeElement.querySelectorAll(
      '[data-testid="facility-3d-floor-selector-option"]',
    );
    (options[1] as HTMLButtonElement).click();

    expect(store.selectFloor).toHaveBeenCalledWith('floor-2');
  });

  it('deselects only the room on backgroundActivated, leaving the floor panel mounted', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    await fixture.whenStable();

    const scene = fixture.debugElement.query(
      (debugElement) => debugElement.name === 'app-facility-building-3d-scene',
    );
    scene.componentInstance.backgroundActivated.emit();

    expect(store.selectRoom).toHaveBeenCalledWith(null);
    expect(store.clearSelection).not.toHaveBeenCalled();
  });

  it('closes the room detail block on its own close control, leaving the floor selection untouched', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    store.selectedRoomId.set('room-1');
    store.selectedRoom.set(ROOM);
    store.selectedFloor.set(FLOOR);
    await fixture.whenStable();

    const panelClose = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-room-panel-close"]',
    ) as HTMLButtonElement;
    panelClose.click();

    expect(store.selectRoom).toHaveBeenCalledWith(null);
    expect(store.clearSelection).not.toHaveBeenCalled();
  });

  it('announces the selected room and floor through the aria-live region', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    await fixture.whenStable();

    store.selectedRoomId.set('room-1');
    store.selectedRoom.set(ROOM);
    store.selectedFloor.set(FLOOR);
    await fixture.whenStable();

    const region = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-selection-announcement"]',
    ) as HTMLElement;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toContain('Server room');
    expect(region.textContent).toContain('Ground floor');
  });

  it('shows a discreet hover label mirroring the scene’s roomHovered output', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    await fixture.whenStable();

    fixture.componentInstance['hoveredRoomId'].set('room-1');
    await fixture.whenStable();

    const label = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-hover-label"]',
    ) as HTMLElement;
    expect(label).not.toBeNull();
    expect(label.getAttribute('aria-hidden')).toBe('true');
    expect(label.textContent).toContain('Server room');
  });

  it('deselects the room on Escape only while a room is selected, never touching the floor', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    await fixture.whenStable();

    const root = fixture.nativeElement.querySelector('#facility-building-3d') as HTMLElement;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(store.selectRoom).not.toHaveBeenCalled();

    store.selectedRoomId.set('room-1');
    await fixture.whenStable();

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(store.selectRoom).toHaveBeenCalledWith(null);
    expect(store.clearSelection).not.toHaveBeenCalled();
  });

  it('moves focus into the room panel on open and restores it to the previously focused element on close', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    document.body.appendChild(fixture.nativeElement);
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-1');
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-reset-camera"]',
    ) as HTMLButtonElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    store.selectedRoomId.set('room-1');
    store.selectedRoom.set(ROOM);
    store.selectedFloor.set(FLOOR);
    await fixture.whenStable();

    const closeButton = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-room-panel-close"]',
    );
    expect(document.activeElement).toBe(closeButton);

    store.selectedRoomId.set(null);
    store.selectedRoom.set(null);
    await fixture.whenStable();

    expect(document.activeElement).toBe(trigger);

    fixture.nativeElement.remove();
  });
});

/**
 * The server render pass. `FacilityBuilding3dStore.loadModel` carries its own
 * `PLATFORM_ID` guard, proven separately by
 * `facility-building-3d.store.spec.ts` ("should not call the service on the
 * server platform"): under `PLATFORM_ID: 'server'` the store's query status
 * never leaves `idle`. This spec proves the page's half of the SSR contract —
 * that an unresolved (`idle`) model renders nothing but the full-frame
 * skeleton, with none of the other four branches, none of which read
 * `window`/`document` outside `afterNextRender`.
 */
describe('FacilityBuilding3dPage (server platform)', () => {
  let fixture: ComponentFixture<FacilityBuilding3dPage>;
  let store: ReturnType<typeof createStoreStub>;

  beforeEach(() => {
    store = createStoreStub();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: FacilityBuilding3dStore, useValue: store },
        { provide: OrganizationPermissionService, useValue: { hasPermission: vi.fn() } },
      ],
    });
  });

  it('renders only the skeleton while the model stays idle, as it does throughout an SSR pass', async () => {
    fixture = await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-loading"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="facility-3d-error"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="facility-3d-empty"]')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-unsupported"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-reset-camera"]'),
    ).toBeNull();
  });
});
