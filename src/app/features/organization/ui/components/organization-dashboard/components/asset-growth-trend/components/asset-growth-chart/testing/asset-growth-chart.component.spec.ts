import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { AssetGrowthChart } from '../asset-growth-chart.component';

const mockAligned = { labels: [], datasets: [[], []] };

const mockStore = {
  isQueryLoading: signal(false),
  queryData: signal(null),
  compareEnabled: signal(false),
  canReadEquipment: signal(true),
  canReadFacilities: signal(true),
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

  function createComponent(
    loading = false,
    visibility: { equipment: boolean; facilities: boolean } = {
      equipment: true,
      facilities: true,
    },
  ) {
    mockStore.isQueryLoading.set(loading);
    mockStore.queryData.set(null);
    mockStore.canReadEquipment.set(visibility.equipment);
    mockStore.canReadFacilities.set(visibility.facilities);
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

  it('should only expose visible datasets', () => {
    const fixture = createComponent(false, { equipment: true, facilities: false });
    const component = fixture.componentInstance as unknown as {
      data(): { datasets: Array<{ label?: string }> };
    };

    expect(component.data().datasets).toHaveLength(1);
    expect(component.data().datasets[0]?.label).toBe('Equipment Created');
  });
});
