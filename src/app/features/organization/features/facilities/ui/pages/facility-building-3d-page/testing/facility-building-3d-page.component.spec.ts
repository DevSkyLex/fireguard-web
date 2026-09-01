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
import type { FacilityBuildingModelOutput } from '@features/organization/features/facilities/models';
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

describe('FacilityBuilding3dPage', () => {
  let fixture: ComponentFixture<FacilityBuilding3dPage>;
  let store: ReturnType<typeof createStoreStub>;
  let hasPermission: ReturnType<typeof vi.fn>;

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
