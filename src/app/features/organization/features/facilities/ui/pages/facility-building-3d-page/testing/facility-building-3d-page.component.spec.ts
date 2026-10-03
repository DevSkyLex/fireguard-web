import {
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { idleCallState, type CallState } from '@core/request-state';
import type { StoreError } from '@core/request-state';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityModelOutput,
  FacilityModelAsset,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import type {
  FacilityBuildingModelFloor,
  FacilityBuildingModelOutput,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import { FacilityModelsStore } from '@features/organization/features/facilities/state';
import { FacilityBuilding3dStore } from '@features/organization/features/facilities/state';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { FacilityBuilding3dPage } from '../facility-building-3d-page.component';

/**
 * The page renders `app-facility-building-3d-scene` in its ready branch,
 * which mounts a real `THREE.WebGLRenderer` — unavailable in jsdom. This
 * page spec is not the scene's own boundary test (that lives in the
 * scene's `testing/`), so `three` and `OrbitControls` are faked here just
 * enough for a silent, no-op mount: the fixture's `queryData` stub carries
 * no floors, so none of the geometry-building utils are ever invoked.
 */
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class FakeRenderer {
    public setPixelRatio = vi.fn();
    public setSize = vi.fn();
    public render = vi.fn();
    public dispose = vi.fn();
  }
  return { ...actual, WebGLRenderer: FakeRenderer };
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
  elevationMeters: null,
  heightMeters: null,
  equipment: [],
  hierarchyIssues: [],
  diagnostics: { invalidGeometryCount: 0, unpositionedEquipmentCount: 0, geometryIssues: [] },
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

const IMPORTED_MODEL: FacilityModelOutput = {
  '@id': '/api/facility-models/model-1',
  '@type': 'FacilityModel',
  id: 'model-1',
  organizationId: 'org-1',
  buildingId: 'building-1',
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
  bindings: [{ nodeIndex: 1, facilityId: 'floor-1' }],
  bindingIssues: [],
  downloadUrl: '/api/facility-models/model-1/download',
  createdAt: '',
  updatedAt: '',
};

const BOUND_FACILITY: FacilityOutput = {
  '@id': '/api/facilities/undrawn-zone',
  '@type': 'Facility',
  id: 'undrawn-zone',
  organizationId: 'org-1',
  parentFacilityId: 'floor-1',
  hasChildren: true,
  type: 'zone',
  name: 'Undrawn assembly',
  code: null,
  status: 'active',
  address: null,
  metadata: {},
  path: [],
  equipmentCount: 0,
  createdAt: '',
  updatedAt: '',
};

const createStoreStub = (): {
  isQueryLoaded: WritableSignal<boolean>;
  queryHasError: WritableSignal<boolean>;
  queryError: WritableSignal<StoreError | null>;
  queryData: WritableSignal<FacilityBuildingModelOutput | null>;
  isEmpty: WritableSignal<boolean>;
  hasNoGeometry: WritableSignal<boolean>;
  exploded: WritableSignal<boolean>;
  metric: WritableSignal<boolean>;
  selectedEquipmentId: WritableSignal<string | null>;
  selectedEquipment: WritableSignal<null>;
  setMetric: ReturnType<typeof vi.fn>;
  selectEquipment: ReturnType<typeof vi.fn>;
  toggleIsolation: ReturnType<typeof vi.fn>;
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
  metric: signal<boolean>(false),
  selectedEquipmentId: signal<string | null>(null),
  selectedEquipment: signal<null>(null),
  setMetric: vi.fn(),
  selectEquipment: vi.fn(),
  toggleIsolation: vi.fn(),
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

const createModelStoreStub = () => ({
  modelEntities: signal<FacilityModelOutput[]>([]),
  selectedModel: signal<FacilityModelOutput | null>(null),
  selectedModelId: signal<string | null>(null),
  selectedNodeIndex: signal<number | null>(null),
  previewAsset: signal<FacilityModelAsset | null>(null),
  settingsSavedToken: signal(0),
  facilityOptions: signal([]),
  bindingFacilities: signal<readonly FacilityOutput[]>([]),
  bindingFloorIds: signal<Readonly<Record<string, string | null>>>({ 'floor-1': 'floor-1' }),
  listCallState: signal(idleCallState()),
  optionsCallState: signal(idleCallState()),
  uploadCallState: signal(idleCallState()),
  updateCallState: signal(idleCallState()),
  previewCallState: signal(idleCallState()),
  activateCallState: signal(idleCallState()),
  removeCallState: signal(idleCallState()),
  downloadCallState: signal<CallState<{ blob: Blob; fileName: string }>>(idleCallState()),
  isListPending: signal(false),
  isUploadPending: signal(false),
  isUpdatePending: signal(false),
  isPreviewPending: signal(false),
  isActivatePending: signal(false),
  isRemovePending: signal(false),
  load: vi.fn(),
  upload: vi.fn(),
  update: vi.fn(),
  activate: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
  select: vi.fn(),
  selectNode: vi.fn(),
  clearNodeSelection: vi.fn(),
  refresh: vi.fn(),
});

const createPage = async (): Promise<ComponentFixture<FacilityBuilding3dPage>> => {
  const created = TestBed.createComponent(FacilityBuilding3dPage);
  created.componentRef.setInput('organizationId', 'org-1');
  created.componentRef.setInput('facilityId', 'facility-1');
  await created.whenStable();

  return created;
};

const mobile = signal(false);

function stubMatchMedia(matches: boolean): void {
  mobile.set(matches);
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
  let modelsStore: ReturnType<typeof createModelStoreStub>;
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
    mobile.set(false);
    store = createStoreStub();
    modelsStore = createModelStoreStub();
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: FacilityBuilding3dStore, useValue: store },
        { provide: FacilityModelsStore, useValue: modelsStore },
        { provide: BrowserDownloadService, useValue: { trigger: vi.fn() } },
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

  it('shows the empty state, with the "Add a floor" action, when the building has no floors', async () => {
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.isEmpty.set(true);
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-empty"]',
    ) as HTMLElement;
    expect(emptyState).not.toBeNull();
    const link = emptyState.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe(
      '/organizations/org-1/facilities?create=1&parent=facility-1',
    );
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

  it('hides the "Add a floor" action from a read-only member, with a neutral description', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.isEmpty.set(true);
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-empty"]',
    ) as HTMLElement;
    expect(emptyState.querySelector('a')).toBeNull();
    expect(emptyState.textContent).not.toContain('Add the floors');
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

    const explodeToggle = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-explode-toggle"]',
    ) as HTMLButtonElement;

    expect(explodeToggle.getAttribute('data-state')).toBe('off');

    explodeToggle.click();
    expect(store.toggleExploded).toHaveBeenCalled();

    store.exploded.set(true);
    await fixture.whenStable();

    expect(explodeToggle.getAttribute('data-state')).toBe('on');
    expect(explodeToggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('holds no navigation link in the scene toolbar, once the model is ready', async () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({} as RenderingContext);

    fixture = await createPage();
    store.isQueryLoaded.set(true);
    await fixture.whenStable();

    getContextSpy.mockRestore();

    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-plan-2d-link"]'),
    ).toBeNull();
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
    expect(element.querySelector('[data-testid="facility-zone-list"]')).not.toBeNull();
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
    expect(modelsStore.clearNodeSelection).toHaveBeenCalled();
    expect(store.clearSelection).not.toHaveBeenCalled();
  });

  it('selects the inherited facility binding when a mesh belongs to an associated parent node', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    const { Group } = await import('three');
    const assembly = new Group();
    assembly.userData = { facilityModelNodeIndex: 1 };
    const leaf = new Group();
    leaf.userData = { facilityModelNodeIndex: 0 };
    assembly.add(leaf);
    fixture = await createPage();
    modelsStore.selectedModel.set(IMPORTED_MODEL);
    modelsStore.selectedModelId.set(IMPORTED_MODEL.id);
    modelsStore.previewAsset.set({
      scene: assembly,
      nodes: [
        { index: 0, name: 'Shell', objects: [leaf] },
        { index: 1, name: 'Assembly', objects: [assembly] },
      ],
    });
    store.isQueryLoaded.set(true);
    await fixture.whenStable();
    const scene = fixture.debugElement.query(
      (debugElement) => debugElement.name === 'app-facility-building-3d-scene',
    );
    scene.componentInstance.importedNodeSelected.emit(0);

    expect(modelsStore.selectNode).toHaveBeenCalledWith(0);
    expect(store.selectRoom).toHaveBeenCalledWith(null);
    expect(store.selectFloor).toHaveBeenCalledWith('floor-1');
    store.selectFloor.mockClear();
    store.selectRoom.mockClear();
    modelsStore.selectedModel.set({
      ...IMPORTED_MODEL,
      bindingIssues: [{ nodeIndex: 0, code: 'target_unavailable' }],
    });
    await fixture.whenStable();
    scene.componentInstance.importedNodeSelected.emit(0);
    expect(modelsStore.selectNode).toHaveBeenCalledWith(0);
    expect(store.selectRoom).toHaveBeenCalledExactlyOnceWith(null);
    expect(store.selectFloor).not.toHaveBeenCalled();
  });

  it('lets a reader select an undrawn non-leaf GLB zone, navigate to its record and isolate its floor', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    hasPermission.mockReturnValue(false);
    const { Group } = await import('three');
    fixture = await createPage();
    const model = {
      ...IMPORTED_MODEL,
      bindings: [{ nodeIndex: 0, facilityId: BOUND_FACILITY.id }],
    };
    modelsStore.selectedModel.set(model);
    modelsStore.selectedModelId.set(model.id);
    modelsStore.modelEntities.set([model]);
    modelsStore.bindingFacilities.set([BOUND_FACILITY]);
    modelsStore.bindingFloorIds.set({ [BOUND_FACILITY.id]: 'floor-1' });
    modelsStore.previewAsset.set({ scene: new Group(), nodes: [] });
    modelsStore.selectNode.mockImplementation((index: number) =>
      modelsStore.selectedNodeIndex.set(index),
    );
    store.floors.set([{ ...FLOOR, rooms: [] }]);
    store.selectFloor.mockImplementation((id: string | null) => {
      store.selectedFloorId.set(id);
      store.selectedFloor.set(id === 'floor-1' ? { ...FLOOR, rooms: [] } : null);
    });
    store.isQueryLoaded.set(true);
    await fixture.whenStable();
    const nodeButton = fixture.nativeElement.querySelector(
      'app-facility-model-manager ul[aria-label="Model objects"] button',
    ) as HTMLButtonElement;
    expect(nodeButton).not.toBeNull();
    nodeButton.click();
    await fixture.whenStable();

    expect(modelsStore.selectNode).toHaveBeenCalledWith(0);
    expect(store.selectRoom).toHaveBeenCalledExactlyOnceWith(null);
    expect(store.selectFloor).toHaveBeenCalledWith('floor-1');
    expect(fixture.componentInstance['selectedImportedFacility']()).toEqual(BOUND_FACILITY);
    const link = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-bound-facility-link"]',
    ) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/organizations/org-1/facilities/undrawn-zone');
    expect(link.parentElement?.textContent).toContain(BOUND_FACILITY.name);
    const announcement = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-selection-announcement"]',
    );
    expect(announcement.textContent).toContain(BOUND_FACILITY.name);
    (
      fixture.nativeElement.querySelector(
        '[data-testid="facility-3d-isolate-floor"]',
      ) as HTMLButtonElement
    ).click();
    expect(store.toggleIsolation).toHaveBeenCalledWith('floor-1');

    store.selectFloor.mockClear();
    modelsStore.selectedModel.set({
      ...model,
      bindingIssues: [{ nodeIndex: 0, code: 'target_unavailable' }],
    });
    await fixture.whenStable();
    nodeButton.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['selectedImportedFacility']()).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-bound-facility-link"]'),
    ).toBeNull();
    expect(store.selectFloor).not.toHaveBeenCalled();
  });

  it.each([
    { change: 'selected floor', bindingFloorId: 'floor-1', clears: true },
    { change: 'isolated floor', bindingFloorId: 'floor-1', clears: true },
    { change: 'selected floor', bindingFloorId: null, clears: false },
  ])(
    'reconciles an undrawn GLB selection when $change changes (binding floor: $bindingFloorId)',
    async ({ change, bindingFloorId, clears }) => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
      const { Group } = await import('three');
      fixture = await createPage();
      const model = {
        ...IMPORTED_MODEL,
        bindings: [{ nodeIndex: 0, facilityId: BOUND_FACILITY.id }],
      };
      const otherFloor = { ...FLOOR, facilityId: 'floor-2', name: 'Other floor', rooms: [] };
      store.floors.set([{ ...FLOOR, rooms: [] }, otherFloor]);
      store.selectedFloorId.set('floor-1');
      store.selectedFloor.set({ ...FLOOR, rooms: [] });
      modelsStore.selectedModel.set(model);
      modelsStore.selectedModelId.set(model.id);
      modelsStore.bindingFacilities.set([BOUND_FACILITY]);
      modelsStore.bindingFloorIds.set({ [BOUND_FACILITY.id]: bindingFloorId });
      modelsStore.selectedNodeIndex.set(0);
      modelsStore.previewAsset.set({ scene: new Group(), nodes: [] });
      modelsStore.clearNodeSelection.mockImplementation(() =>
        modelsStore.selectedNodeIndex.set(null),
      );
      store.selectFloor.mockImplementation((id: string) => {
        store.selectedFloorId.set(id);
        store.selectedFloor.set(otherFloor);
      });
      store.isQueryLoaded.set(true);
      await fixture.whenStable();
      const scaleInput = fixture.nativeElement.querySelector('#model-scale') as HTMLInputElement;
      scaleInput.value = '2';
      scaleInput.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();
      expect(
        fixture.nativeElement.querySelector('[data-testid="facility-3d-bound-facility-link"]'),
      ).not.toBeNull();
      expect(modelsStore.clearNodeSelection).not.toHaveBeenCalled();
      if (change === 'selected floor') {
        const floorButtons = fixture.nativeElement.querySelectorAll(
          '[data-testid="facility-3d-floor-selector-option"]',
        );
        (floorButtons[1] as HTMLButtonElement).click();
        expect(store.selectFloor).toHaveBeenCalledWith('floor-2');
      } else store.isolatedFloorId.set('floor-2');
      await fixture.whenStable();
      const scene = fixture.debugElement.query(
        (element) => element.name === 'app-facility-building-3d-scene',
      );
      if (clears) {
        expect(modelsStore.clearNodeSelection).toHaveBeenCalledOnce();
        expect(modelsStore.selectedNodeIndex()).toBeNull();
        expect(fixture.componentInstance['selectedImportedFacility']()).toBeNull();
        expect(
          fixture.nativeElement.querySelector('[data-testid="facility-3d-bound-facility-link"]'),
        ).toBeNull();
        expect(scene.componentInstance.selectedNodeIndex()).toBeNull();
        expect(scene.componentInstance.selectedFacilityId()).toBeNull();
      } else {
        expect(modelsStore.clearNodeSelection).not.toHaveBeenCalled();
        expect(modelsStore.selectedNodeIndex()).toBe(0);
        expect(
          fixture.nativeElement.querySelector('[data-testid="facility-3d-bound-facility-link"]'),
        ).not.toBeNull();
      }
      expect(fixture.componentInstance['renderedImportedModel']()?.transform.scale).toBe(2);
    },
  );

  it('does not select or link a GLB target owned by a nested building', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    const { Group } = await import('three');
    fixture = await createPage();
    modelsStore.selectedModel.set({
      ...IMPORTED_MODEL,
      bindings: [{ nodeIndex: 0, facilityId: BOUND_FACILITY.id }],
    });
    modelsStore.selectedModelId.set(IMPORTED_MODEL.id);
    modelsStore.bindingFacilities.set([BOUND_FACILITY]);
    modelsStore.bindingFloorIds.set({});
    modelsStore.selectedNodeIndex.set(0);
    modelsStore.previewAsset.set({ scene: new Group(), nodes: [] });
    store.isQueryLoaded.set(true);
    await fixture.whenStable();
    const scene = fixture.debugElement.query(
      (element) => element.name === 'app-facility-building-3d-scene',
    );
    scene.componentInstance.importedNodeSelected.emit(0);
    expect(store.selectFloor).not.toHaveBeenCalled();
    expect(store.selectRoom).toHaveBeenCalledExactlyOnceWith(null);
    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-3d-bound-facility-link"]'),
    ).toBeNull();
  });

  it('passes exploded layout only to the generated representation', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    const { Group } = await import('three');
    fixture = await createPage();
    store.exploded.set(true);
    store.isQueryLoaded.set(true);
    await fixture.whenStable();
    let scene = fixture.debugElement.query(
      (element) => element.name === 'app-facility-building-3d-scene',
    );
    expect(scene.componentInstance.exploded()).toBe(true);
    modelsStore.selectedModel.set(IMPORTED_MODEL);
    modelsStore.selectedModelId.set(IMPORTED_MODEL.id);
    modelsStore.previewAsset.set({ scene: new Group(), nodes: [] });
    await fixture.whenStable();
    scene = fixture.debugElement.query(
      (element) => element.name === 'app-facility-building-3d-scene',
    );
    expect(scene.componentInstance.exploded()).toBe(false);
    expect(store.exploded()).toBe(true);
    fixture.componentInstance['onModelModeChanged']('generated');
    await fixture.whenStable();
    expect(scene.componentInstance.exploded()).toBe(true);
  });

  it('returns to the generated empty state after the final imported model is removed', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    const { Group } = await import('three');
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.isEmpty.set(true);
    modelsStore.selectedModel.set(IMPORTED_MODEL);
    modelsStore.selectedModelId.set(IMPORTED_MODEL.id);
    modelsStore.previewAsset.set({ scene: new Group(), nodes: [] });
    await fixture.whenStable();
    expect(fixture.componentInstance['sceneMode']()).toBe('imported');
    expect(fixture.nativeElement.querySelector('[data-testid="facility-3d-empty"]')).toBeNull();

    modelsStore.previewAsset.set(null);
    modelsStore.isPreviewPending.set(true);
    await fixture.whenStable();
    expect(fixture.componentInstance['sceneMode']()).toBe('imported');

    modelsStore.isPreviewPending.set(false);
    modelsStore.selectedModel.set(null);
    modelsStore.selectedModelId.set(null);
    await fixture.whenStable();
    expect(fixture.componentInstance['sceneMode']()).toBe('generated');
    expect(fixture.nativeElement.querySelector('[data-testid="facility-3d-empty"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });

  it('clears an imported node selection with Escape while preserving the current floor', async () => {
    fixture = await createPage();
    modelsStore.selectedNodeIndex.set(0);
    store.selectedFloorId.set('floor-1');
    await fixture.whenStable();
    const root = fixture.nativeElement.querySelector('[data-testid="facility-3d-page"]');
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(modelsStore.clearNodeSelection).toHaveBeenCalledOnce();
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

  it("navigates to the selected room's own floor record, not the building, when its 2D plan is requested", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    fixture = await createPage();
    store.isQueryLoaded.set(true);
    store.selectedFloorId.set('floor-9');
    store.selectedRoomId.set('room-1');
    store.selectedRoom.set(ROOM);
    store.selectedFloor.set(FLOOR);
    await fixture.whenStable();

    const router: Router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (
      fixture.nativeElement.querySelector(
        '[data-testid="facility-3d-room-panel-plan-2d"]',
      ) as HTMLButtonElement
    ).click();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'floor-9'], {
      queryParams: { tab: 'plans' },
    });
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
  let modelsStore: ReturnType<typeof createModelStoreStub>;

  beforeEach(() => {
    store = createStoreStub();
    modelsStore = createModelStoreStub();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: signal(false) },
        },
        { provide: FacilityBuilding3dStore, useValue: store },
        { provide: FacilityModelsStore, useValue: modelsStore },
        { provide: BrowserDownloadService, useValue: { trigger: vi.fn() } },
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
