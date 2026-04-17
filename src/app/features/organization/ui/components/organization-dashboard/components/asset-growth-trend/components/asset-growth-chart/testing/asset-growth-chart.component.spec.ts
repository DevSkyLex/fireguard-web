import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { AssetGrowthChart } from '../asset-growth-chart.component';

const mockAligned = { labels: [], datasets: [[], []] };

const mockStore = {
  isQueryLoading: signal(false),
  queryData: signal(null),
  compareEnabled: signal(false),
  selectedGranularity: signal('day'),
  alignedTrendData: signal(mockAligned),
};

describe('AssetGrowthChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AssetGrowthChart],
      providers: [
        { provide: OrganizationDashboardAssetGrowthStore, useValue: mockStore },
      ],
    });
  });

  function createComponent(loading = false) {
    mockStore.isQueryLoading.set(loading);
    mockStore.queryData.set(null);
    const fixture = TestBed.createComponent(AssetGrowthChart);
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
