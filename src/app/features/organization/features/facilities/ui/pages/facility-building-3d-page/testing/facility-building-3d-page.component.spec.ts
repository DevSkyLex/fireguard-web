import {
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { FacilityBuilding3dStore } from '@features/organization/features/facilities/state';
import { FacilityBuilding3dPage } from '../facility-building-3d-page.component';

const createStoreStub = (): {
  isQueryLoaded: WritableSignal<boolean>;
  queryHasError: WritableSignal<boolean>;
  queryError: WritableSignal<StoreError | null>;
  isEmpty: WritableSignal<boolean>;
  exploded: WritableSignal<boolean>;
  loadModel: ReturnType<typeof vi.fn>;
  resetCamera: ReturnType<typeof vi.fn>;
  toggleExploded: ReturnType<typeof vi.fn>;
} => ({
  isQueryLoaded: signal<boolean>(false),
  queryHasError: signal<boolean>(false),
  queryError: signal<StoreError | null>(null),
  isEmpty: signal<boolean>(false),
  exploded: signal<boolean>(false),
  loadModel: vi.fn(),
  resetCamera: vi.fn(),
  toggleExploded: vi.fn(),
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
