import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardInspectionQualityStore } from '@features/organization/state/organization-dashboard';
import { InspectionQualityFilters } from '../inspection-quality-filters.component';

const mockStore = {
  selectedInspectionStatus: signal<string | null>('draft'),
  selectedInspectionResult: signal<string | null>('pass'),
  selectedInspectorType: signal<string | null>(null),
  selectedNonConformitySeverity: signal<string | null>('low'),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal(false),
  draftInspectionStatus: signal<string | null>('draft'),
  draftInspectionResult: signal<string | null>('pass'),
  draftInspectorType: signal<string | null>(null),
  draftNonConformitySeverity: signal<string | null>('low'),
  draftDateRange: signal<Date[] | null>(null),
  draftCompareEnabled: signal(false),
  isQueryLoading: signal(false),
  setInspectionStatus: vi.fn(),
  setInspectionResult: vi.fn(),
  setInspectorType: vi.fn(),
  setNonConformitySeverity: vi.fn(),
  setDateRange: vi.fn(),
  setCompareEnabled: vi.fn(),
  setDraftInspectionStatus: vi.fn(),
  setDraftInspectionResult: vi.fn(),
  setDraftInspectorType: vi.fn(),
  setDraftNonConformitySeverity: vi.fn(),
  setDraftDateRange: vi.fn(),
  setDraftCompareEnabled: vi.fn(),
};

describe('InspectionQualityFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectionQualityFilters],
      providers: [{ provide: OrganizationDashboardInspectionQualityStore, useValue: mockStore }],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(InspectionQualityFilters);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the four selects and the shared base filters form', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelectorAll('p-select')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('app-trend-base-filters-form')).not.toBeNull();
  });

  it('should resolve selected option labels from store state', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedInspectionStatusOption()?.label).toBe('Draft');
    expect(fixture.componentInstance.selectedInspectionResultOption()?.label).toBe('Pass');
    expect(fixture.componentInstance.selectedNonConformitySeverityOption()?.label).toBe('Low');
  });
});
