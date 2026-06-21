import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
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
    loadRootFacilities: vi.fn(),
    archive: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };

  const mockQuotaStore = {
    isAtLimit: vi.fn(() => false),
  };

  beforeEach(() => {
    mockFacilityStore.rootFacilities.set([]);
    mockFacilityStore.totalRootFacilities.set(0);
    mockFacilityStore.isLoadingRootFacilities.set(false);
    mockFacilityStore.isRootEmpty.set(true);
    mockFacilityStore.loadRootFacilities.mockReset();
    mockFacilityStore.archive.mockReset();

    TestBed.configureTestingModule({
      imports: [FacilityListPage],
      providers: [
        provideRouter([]),
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: OrganizationQuotaStore, useValue: mockQuotaStore },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: vi.fn(() => true) },
        },
      ],
    }).overrideComponent(FacilityListPage, {
      set: { providers: [{ provide: FacilityStore, useValue: mockFacilityStore }] },
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
});
