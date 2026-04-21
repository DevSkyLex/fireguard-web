import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { AssetGrowthFilters } from '../asset-growth-filters.component';

const mockAligned = { labels: [], datasets: [[], []] };

const mockStore = {
  canReadEquipment: signal(true),
  canReadFacilities: signal(true),
  selectedEquipmentType: signal(null),
  selectedEquipmentStatus: signal(null),
  selectedFacilityType: signal(null),
  selectedDateRange: signal(null),
  compareEnabled: signal(false),
  isQueryLoading: signal(false),
  alignedTrendData: signal(mockAligned),
  setEquipmentType: vi.fn(),
  setEquipmentStatus: vi.fn(),
  setFacilityType: vi.fn(),
  setDateRange: vi.fn(),
  setCompareEnabled: vi.fn(),
};

describe('AssetGrowthFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AssetGrowthFilters],
      providers: [
        { provide: OrganizationDashboardAssetGrowthStore, useValue: mockStore },
      ],
    });
  });

  function createComponent(
    visibility: { equipment: boolean; facilities: boolean } = {
      equipment: true,
      facilities: true,
    },
  ) {
    mockStore.canReadEquipment.set(visibility.equipment);
    mockStore.canReadFacilities.set(visibility.facilities);
    const fixture = TestBed.createComponent(AssetGrowthFilters);
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

  it('should resolve selectedEquipmentStatusOption as null when no status selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedEquipmentStatusOption()).toBeNull();
  });

  it('should resolve selectedFacilityTypeOption as null when no facility type selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedFacilityTypeOption()).toBeNull();
  });

  it('should only render filters for visible resource dimensions', () => {
    const fixture = createComponent({ equipment: false, facilities: true });

    expect(fixture.nativeElement.querySelectorAll('p-select')).toHaveLength(1);
  });
});
