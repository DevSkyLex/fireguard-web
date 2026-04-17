import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { AssetGrowthFilters } from '../asset-growth-filters.component';

const mockAligned = { labels: [], datasets: [[], []] };

const mockStore = {
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

  function createComponent() {
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
});
