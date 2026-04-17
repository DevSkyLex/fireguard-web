import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardNonConformitiesResolvedStore } from '@features/organization/state/organization-dashboard';
import { NonConformitiesResolvedFilters } from '../non-conformities-resolved-filters.component';

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

describe('NonConformitiesResolvedFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NonConformitiesResolvedFilters],
      providers: [
        { provide: OrganizationDashboardNonConformitiesResolvedStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(NonConformitiesResolvedFilters);
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
