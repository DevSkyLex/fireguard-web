import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardInspectionsTrendStore } from '@features/organization/state/organization-dashboard';
import { InspectionsFilters } from '../inspections-filters.component';

const mockStore = {
  selectedInspectionStatus: signal(null),
  selectedInspectionResult: signal(null),
  selectedInspectorType: signal(null),
  selectedDateRange: signal(null),
  compareEnabled: signal(false),
  isQueryLoading: signal(false),
  setInspectionStatus: vi.fn(),
  setInspectionResult: vi.fn(),
  setInspectorType: vi.fn(),
  setDateRange: vi.fn(),
  setCompareEnabled: vi.fn(),
};

describe('InspectionsFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectionsFilters],
      providers: [
        { provide: OrganizationDashboardInspectionsTrendStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(InspectionsFilters);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render three selects and the compare toggle', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelectorAll('p-select')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('p-togglebutton')).not.toBeNull();
  });

  it('should resolve selectedInspectionStatusOption as null when no status selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedInspectionStatusOption()).toBeNull();
  });

  it('should resolve selectedInspectionResultOption as null when no result selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedInspectionResultOption()).toBeNull();
  });
});
