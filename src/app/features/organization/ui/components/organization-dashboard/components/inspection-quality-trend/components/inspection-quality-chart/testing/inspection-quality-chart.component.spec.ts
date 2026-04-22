import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardInspectionQualityStore } from '@features/organization/state/organization-dashboard';
import { InspectionQualityChart } from '../inspection-quality-chart.component';

const mockStore = {
  isQueryLoading: signal(false),
  queryData: signal(null),
  selectedGranularity: signal('week'),
  selectedInspectionStatus: signal(null),
  selectedInspectionResult: signal(null),
  selectedNonConformitySeverity: signal(null),
  alignedTrendData: signal({ buckets: [], labels: [], datasets: [[], []] }),
  rateSeriesData: signal([]),
};

describe('InspectionQualityChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectionQualityChart],
      providers: [{ provide: OrganizationDashboardInspectionQualityStore, useValue: mockStore }],
    });
  });

  function createComponent(loading = false) {
    mockStore.isQueryLoading.set(loading);
    mockStore.queryData.set(null);
    const fixture = TestBed.createComponent(InspectionQualityChart);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a skeleton while loading', () => {
    const fixture = createComponent(true);
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('should render the chart when not in initial loading state', () => {
    mockStore.isQueryLoading.set(false);
    const fixture = TestBed.createComponent(InspectionQualityChart);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
  });
});
