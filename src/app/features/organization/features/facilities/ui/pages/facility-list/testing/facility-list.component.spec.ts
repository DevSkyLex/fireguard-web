import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityOutput,
  FacilityTreeNode,
} from '@features/organization/features/facilities/models';
import { FacilityStore, FacilityTreeStore } from '@features/organization/features/facilities/state';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { FacilityListPage } from '../facility-list.component';

const MOCK_ORG: OrganizationOutput = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
} as OrganizationOutput;

const MOCK_FACILITY: FacilityOutput = {
  id: 'fac-1',
  organizationId: 'org-1',
  name: 'Main Site',
  type: 'site',
  status: 'active',
  code: null,
  parentFacilityId: null,
  hasChildren: false,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as FacilityOutput;

describe('FacilityListPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  const mockFacilityStore = {
    rootFacilities: signal<readonly FacilityOutput[]>([]),
    totalRootFacilities: signal<number>(0),
    isLoadingRootFacilities: signal<boolean>(false),
    isRootEmpty: signal<boolean>(true),
    rootListCallState: signal({ status: 'success' as const }),
    loadRootFacilities: vi.fn(),
    archive: vi.fn(),
  };

  const mockTreeStore = {
    nodes: signal<readonly FacilityTreeNode[]>([]),
    isQueryLoading: signal<boolean>(false),
    queryHasError: signal<boolean>(false),
    isEmpty: signal<boolean>(true),
    load: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };

  const mockQuotaStore = {
    isAtLimit: vi.fn(() => false),
  };

  const mockPermissionService = {
    hasPermission: vi.fn(() => true),
  };

  beforeEach(() => {
    mockFacilityStore.rootFacilities.set([]);
    mockFacilityStore.totalRootFacilities.set(0);
    mockFacilityStore.isLoadingRootFacilities.set(false);
    mockFacilityStore.isRootEmpty.set(true);
    mockFacilityStore.rootListCallState.set({ status: 'success' });
    mockFacilityStore.loadRootFacilities.mockReset();
    mockFacilityStore.archive.mockReset();
    mockTreeStore.nodes.set([]);
    mockTreeStore.isQueryLoading.set(false);
    mockTreeStore.queryHasError.set(false);
    mockTreeStore.load.mockReset();
    mockPermissionService.hasPermission.mockReset();
    mockPermissionService.hasPermission.mockReturnValue(true);

    TestBed.configureTestingModule({
      imports: [FacilityListPage],
      providers: [
        provideRouter([]),
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: OrganizationQuotaStore, useValue: mockQuotaStore },
        {
          provide: OrganizationPermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).overrideComponent(FacilityListPage, {
      set: {
        providers: [
          { provide: FacilityStore, useValue: mockFacilityStore },
          { provide: FacilityTreeStore, useValue: mockTreeStore },
        ],
      },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the page heading', () => {
    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Facilities');
  });

  it('should show facilities when loaded', () => {
    mockFacilityStore.rootFacilities.set([MOCK_FACILITY]);
    mockFacilityStore.isRootEmpty.set(false);
    mockFacilityStore.totalRootFacilities.set(1);

    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Main Site');
  });

  // Rendering 30 skeleton rows occasionally exceeds the default 5s
  // timeout on loaded machines, hence the explicit allowance.
  it('should show skeleton placeholders while loading', { timeout: 15_000 }, () => {
    mockFacilityStore.isLoadingRootFacilities.set(true);
    mockFacilityStore.isRootEmpty.set(false);

    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    const skeleton = fixture.debugElement.query(By.css('.p-skeleton'));
    expect(skeleton).toBeTruthy();
  });

  it('should forward the root load request to the store', () => {
    mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);
    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    fixture.componentInstance.onLoad({ page: 2, itemsPerPage: 20 });
    expect(mockFacilityStore.loadRootFacilities).toHaveBeenCalledWith({
      organizationId: 'org-1',
      options: { page: 2, itemsPerPage: 20 },
    });
  });

  it('should forward the archive event to the store', () => {
    mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);
    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    fixture.componentInstance.onArchive(MOCK_FACILITY);
    expect(mockFacilityStore.archive).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'fac-1',
    });
  });

  it('should not call archive when organization is missing', () => {
    mockActiveOrgStore.selectedOrganization.set(null);
    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    fixture.componentInstance.onArchive(MOCK_FACILITY);
    expect(mockFacilityStore.archive).not.toHaveBeenCalled();
  });

  // The hierarchy endpoint is owned by the backend's Compliance module and
  // needs `compliance.read`. A member holding only `facilities.read` must still
  // get the list — including when they open a shared `?view=tree` link.
  describe('hierarchy permission asymmetry', () => {
    /** Every organization id the page asked the tree store to load. */
    const loadTargets = (): unknown[] =>
      mockTreeStore.load.mock.calls.flatMap((call: unknown[]): unknown[] => {
        const argument: unknown = call[0];
        return typeof argument === 'function' ? [(argument as () => unknown)()] : [argument];
      });

    const render = (granted: boolean, view: 'list' | 'tree' = 'tree') => {
      mockPermissionService.hasPermission.mockReturnValue(granted);
      mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);

      const fixture = TestBed.createComponent(FacilityListPage);
      fixture.componentRef.setInput('view', view);
      fixture.detectChanges();
      return fixture;
    };

    it('should render the hierarchy for a member holding compliance.read', () => {
      const fixture = render(true);

      expect(fixture.nativeElement.querySelector('app-facility-tree-table')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-facility-table')).toBeNull();
    });

    it('should fall back to the list when compliance.read is missing', () => {
      const fixture = render(false);

      expect(fixture.nativeElement.querySelector('app-facility-tree-table')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-facility-table')).not.toBeNull();
    });

    it('should hide the view switcher entirely without compliance.read', () => {
      const fixture = render(false, 'list');

      expect(fixture.nativeElement.querySelector('p-selectbutton')).toBeNull();
    });

    // Querying a hierarchy the member cannot read would fire a guaranteed 403.
    it('should not query the hierarchy without compliance.read', () => {
      render(false);

      expect(loadTargets()).not.toContain('org-1');
    });

    // Landing on the list must not pay for the hierarchy.
    it('should query the hierarchy only once it is on screen', () => {
      render(true, 'list');

      expect(loadTargets()).not.toContain('org-1');
    });

    it('should query the hierarchy when it is on screen and permitted', () => {
      render(true);

      expect(loadTargets()).toContain('org-1');
    });
  });
});
