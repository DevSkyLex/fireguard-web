import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardFacilitiesCreatedStore } from '@features/organization/state/organization-dashboard';
import { FacilitiesCreatedFilters } from '../facilities-created-filters.component';

const mockStore = {
  selectedFacilityType: signal<string | null>(null),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal(false),
  isQueryLoading: signal(false),
  setFacilityType: vi.fn(),
  setDateRange: vi.fn(),
  setCompareEnabled: vi.fn(),
};

describe('FacilitiesCreatedFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FacilitiesCreatedFilters],
      providers: [
        { provide: OrganizationDashboardFacilitiesCreatedStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(FacilitiesCreatedFilters);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose selectedFacilityTypeOption as null when no type selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedFacilityTypeOption()).toBeNull();
  });

  it('should render the facility type select', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelector('p-select')).not.toBeNull();
  });

  it('should render the compare togglebutton', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelector('p-togglebutton')).not.toBeNull();
  });
});
