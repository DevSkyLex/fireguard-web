import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardNonConformitiesResolvedStore } from '@features/organization/state/organization-dashboard';
import { NonConformitiesResolvedChart } from '../non-conformities-resolved-chart.component';

const mockStore = {
  isQueryLoading: signal(false),
  queryData: signal(null),
  compareEnabled: signal(false),
};

describe('NonConformitiesResolvedChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NonConformitiesResolvedChart],
      providers: [
        { provide: OrganizationDashboardNonConformitiesResolvedStore, useValue: mockStore },
      ],
    });
  });

  function createComponent(loading = false) {
    mockStore.isQueryLoading.set(loading);
    mockStore.queryData.set(null);
    const fixture = TestBed.createComponent(NonConformitiesResolvedChart);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeleton when loading and no data', () => {
    const fixture = createComponent(true);
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('should show chart when not loading', () => {
    const fixture = createComponent(false);
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
  });
});
