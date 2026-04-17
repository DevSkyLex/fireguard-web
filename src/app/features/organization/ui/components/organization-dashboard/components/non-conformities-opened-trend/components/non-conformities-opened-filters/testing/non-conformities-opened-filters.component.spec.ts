import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import { NonConformitiesOpenedFilters } from '../non-conformities-opened-filters.component';

const mockStore = {
  selectedNonConformityStatus: signal(null),
  selectedNonConformitySeverity: signal(null),
  selectedDateRange: signal(null),
  compareEnabled: signal(false),
  isQueryLoading: signal(false),
  setNonConformityStatus: vi.fn(),
  setNonConformitySeverity: vi.fn(),
  setDateRange: vi.fn(),
  setCompareEnabled: vi.fn(),
};

describe('NonConformitiesOpenedFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NonConformitiesOpenedFilters],
      providers: [
        { provide: OrganizationDashboardNonConformitiesOpenedStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(NonConformitiesOpenedFilters);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render two selects and the compare toggle', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelectorAll('p-select')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('p-togglebutton')).not.toBeNull();
  });

  it('should resolve selectedNonConformityStatusOption as null when no status selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedNonConformityStatusOption()).toBeNull();
  });

  it('should resolve selectedSeverityOption as null when no severity selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedSeverityOption()).toBeNull();
  });
});
