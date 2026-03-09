import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { FacilityListPage } from './facility-list.component';
import { ActiveOrganizationStore } from '@core/stores/organization';
import { FacilityStore } from '@core/stores/facility';
import type { FacilityOutput } from '@core/models/facility';
import type { OrganizationOutput } from '@core/models/organization';

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
    facilities: signal<readonly FacilityOutput[]>([]),
    totalFacilities: signal<number>(0),
    isLoadingFacilities: signal<boolean>(false),
    isEmpty: signal<boolean>(true),
    loadFacilities: vi.fn(),
    archive: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };

  beforeEach(() => {
    mockFacilityStore.facilities.set([]);
    mockFacilityStore.totalFacilities.set(0);
    mockFacilityStore.isLoadingFacilities.set(false);
    mockFacilityStore.isEmpty.set(true);
    mockFacilityStore.loadFacilities.mockReset();
    mockFacilityStore.archive.mockReset();

    TestBed.configureTestingModule({
      imports: [FacilityListPage],
      providers: [
        provideRouter([]),
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
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
    mockFacilityStore.facilities.set([MOCK_FACILITY]);
    mockFacilityStore.isEmpty.set(false);
    mockFacilityStore.totalFacilities.set(1);

    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Main Site');
  });

  it('should show skeletons while loading', () => {
    mockFacilityStore.isLoadingFacilities.set(true);
    mockFacilityStore.isEmpty.set(false);

    const fixture = TestBed.createComponent(FacilityListPage);
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
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
