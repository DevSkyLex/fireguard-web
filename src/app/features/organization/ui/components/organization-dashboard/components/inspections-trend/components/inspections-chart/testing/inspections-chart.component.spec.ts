import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardInspectionsTrendStore } from '@features/organization/state/organization-dashboard';
import { InspectionsChart } from '../inspections-chart.component';

const mockStore = {
  isQueryLoading: signal(false),
  queryData: signal(null),
  compareEnabled: signal(false),
  selectedInspectionResult: signal(null),
  selectedInspectionStatus: signal(null),
};

describe('InspectionsChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectionsChart],
      providers: [
        { provide: OrganizationDashboardInspectionsTrendStore, useValue: mockStore },
      ],
    });
  });

  function createComponent(loading = false) {
    mockStore.isQueryLoading.set(loading);
    mockStore.queryData.set(null);
    const fixture = TestBed.createComponent(InspectionsChart);
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
    const fixture = TestBed.createComponent(InspectionsChart);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
  });
});
