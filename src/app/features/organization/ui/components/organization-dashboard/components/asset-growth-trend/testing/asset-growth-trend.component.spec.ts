import { Component, input, output, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { AssetGrowthTrendStore } from '@features/organization/state/organization-dashboard';
import { AssetGrowthTrend } from '../asset-growth-trend.component';

type MockAssetGrowthData = {
  readonly equipment: OrganizationDashboardTrendOutput | null;
  readonly facilities: OrganizationDashboardTrendOutput | null;
};

type AssetGrowthTrendHarness = {
  readonly cardTitle: () => string;
  readonly cardDescription: () => string;
  readonly activeFilterCount: () => number;
  readonly summaryMetrics: () => ReadonlyArray<{
    readonly label: string;
    readonly value: string;
    readonly comparison: unknown;
  }>;
  readonly menuItems: () => ReadonlyArray<{
    readonly label?: string;
    readonly routerLink?: readonly string[] | null;
  }>;
  readonly onFilterToggle: () => void;
  readonly onCancelFilters: () => void;
  readonly onResetFilters: () => void;
  readonly onApplyFilters: () => void;
};

type MockAssetGrowthStore = {
  readonly isQueryLoading: WritableSignal<boolean>;
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly canReadEquipment: WritableSignal<boolean>;
  readonly canReadFacilities: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly selectedEquipmentType: WritableSignal<string | null>;
  readonly selectedEquipmentStatus: WritableSignal<string | null>;
  readonly selectedFacilityType: WritableSignal<string | null>;
  readonly queryData: WritableSignal<MockAssetGrowthData | null>;
  readonly openFilters: ReturnType<typeof vi.fn>;
  readonly cancelDraftFilters: ReturnType<typeof vi.fn>;
  readonly resetDraftFilters: ReturnType<typeof vi.fn>;
  readonly applyDraftFilters: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
};

@Component({
  selector: 'app-trend-card',
  template: '<ng-content />',
})
class TrendCardStub {
  public readonly title = input<string>('');
  public readonly description = input<string>('');
  public readonly metrics = input<readonly unknown[]>([]);
  public readonly loading = input<boolean>(false);
}

@Component({
  selector: 'app-asset-growth-toolbar',
  template: '',
})
class AssetGrowthToolbarStub {
  public readonly activeFilterCount = input<number>(0);
  public readonly filtersAvailable = input<boolean>(false);
  public readonly filterToggle = output<void>();
  public readonly menuToggle = output<MouseEvent>();
}

@Component({
  selector: 'app-asset-growth-chart',
  template: '',
})
class AssetGrowthChartStub {}

@Component({
  selector: 'app-asset-growth-filters',
  template: '',
})
class AssetGrowthFiltersStub {}

@Component({
  selector: 'app-trend-filter-drawer',
  template: '<ng-content />',
})
class TrendFilterDrawerStub {
  public readonly title = input<string>('');
  public readonly description = input<string | undefined>(undefined);
  public readonly visible = input<boolean>(false);
  public readonly loading = input<boolean>(false);
  public readonly cancel = output<void>();
  public readonly reset = output<void>();
  public readonly apply = output<void>();
}

const MOCK_ORGANIZATION: OrganizationOutput = {
  '@id': '/organizations/org-asset-growth',
  '@type': 'Organization',
  id: 'org-asset-growth',
  name: 'Fireguard Demo Org',
  slug: 'fireguard-demo-org',
  isActive: true,
  memberCount: 12,
  status: 'active',
  ownerUserId: 'user-1',
  createdByUserId: 'user-1',
  createdAt: '2026-04-22T00:00:00Z',
  updatedAt: '2026-04-22T00:00:00Z',
};

const createTrendOutput = (
  metric: string,
  seriesValues: readonly number[],
  comparisonValues: readonly number[] = [],
): OrganizationDashboardTrendOutput =>
  ({
    '@id': `/dashboard/trends/${metric}`,
    '@type': 'OrganizationDashboardTrend',
    generatedAt: '2026-04-22T00:00:00Z',
    metric,
    period: {} as OrganizationDashboardTrendOutput['period'],
    summary: {} as OrganizationDashboardTrendOutput['summary'],
    series: seriesValues.map((value: number, index: number) => ({
      bucket: `2026-04-${String(index + 1).padStart(2, '0')}`,
      value,
    })),
    comparison: {
      series: comparisonValues.map((value: number, index: number) => ({
        bucket: `2026-03-${String(index + 1).padStart(2, '0')}`,
        value,
      })),
    } as OrganizationDashboardTrendOutput['comparison'],
  }) as OrganizationDashboardTrendOutput;

const MOCK_QUERY_DATA: MockAssetGrowthData = {
  equipment: createTrendOutput('equipment-created', [3, 2], [1, 1]),
  facilities: createTrendOutput('facilities-created', [2, 1], [1, 0]),
};

const mockDashboardStore: MockAssetGrowthStore = {
  isQueryLoading: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  canReadEquipment: signal<boolean>(true),
  canReadFacilities: signal<boolean>(true),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
  selectedEquipmentType: signal<string | null>(null),
  selectedEquipmentStatus: signal<string | null>(null),
  selectedFacilityType: signal<string | null>(null),
  queryData: signal<MockAssetGrowthData | null>(null),
  openFilters: vi.fn(),
  cancelDraftFilters: vi.fn(),
  resetDraftFilters: vi.fn(),
  applyDraftFilters: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
};

describe('AssetGrowthTrend', () => {
  beforeEach(() => {
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.canReadEquipment.set(true);
    mockDashboardStore.canReadFacilities.set(true);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.selectedEquipmentType.set(null);
    mockDashboardStore.selectedEquipmentStatus.set(null);
    mockDashboardStore.selectedFacilityType.set(null);
    mockDashboardStore.queryData.set(null);
    mockDashboardStore.openFilters.mockReset();
    mockDashboardStore.cancelDraftFilters.mockReset();
    mockDashboardStore.resetDraftFilters.mockReset();
    mockDashboardStore.applyDraftFilters.mockReset();
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [AssetGrowthTrend],
      providers: [provideRouter([])],
    }).overrideComponent(AssetGrowthTrend, {
      set: {
        imports: [
          MenuModule,
          TrendCardStub,
          TrendFilterDrawerStub,
          AssetGrowthToolbarStub,
          AssetGrowthChartStub,
          AssetGrowthFiltersStub,
        ],
        providers: [
          { provide: AssetGrowthTrendStore, useValue: mockDashboardStore },
          { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
        ],
      },
    });
  });

  function createComponent(): AssetGrowthTrendHarness {
    const fixture = TestBed.createComponent(AssetGrowthTrend);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as AssetGrowthTrendHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should derive combined copy and summary metrics when both resources are visible', () => {
    mockDashboardStore.queryData.set(MOCK_QUERY_DATA);
    const component = createComponent();

    expect(component.cardTitle()).toBe('Asset Growth Momentum');
    expect(component.cardDescription()).toBe('Equipment and facilities created over time');
    expect(component.summaryMetrics().map((metric) => metric.label)).toEqual([
      'Equipment Added',
      'Facilities Added',
      'Combined Growth',
      'Equipment / Facility',
    ]);
    expect(component.summaryMetrics()[0]?.comparison).not.toBeNull();
    expect(component.summaryMetrics()[3]?.value).toBe('1.7x');
  });

  it('should narrow the copy and quick links to the visible resources', () => {
    mockDashboardStore.canReadFacilities.set(false);
    mockDashboardStore.queryData.set(MOCK_QUERY_DATA);
    const component = createComponent();

    expect(component.cardTitle()).toBe('Equipment Growth Momentum');
    expect(component.cardDescription()).toBe('Equipment created over time');
    expect(component.menuItems()).toHaveLength(1);
    expect(component.menuItems()[0]).toMatchObject({
      label: 'View all equipment',
      routerLink: ['/organizations', MOCK_ORGANIZATION.id, 'equipment'],
    });
  });

  it('should count base and dimension filters on the toolbar badge', () => {
    mockDashboardStore.selectedDateRange.set([new Date('2026-01-01'), new Date('2026-01-08')]);
    mockDashboardStore.compareEnabled.set(false);
    mockDashboardStore.selectedEquipmentType.set('extinguisher');
    const component = createComponent();

    expect(component.activeFilterCount()).toBe(3);
  });

  it('should open filters only when at least one resource can be filtered', () => {
    const component = createComponent();

    component.onFilterToggle();
    expect(mockDashboardStore.openFilters).toHaveBeenCalledTimes(1);

    mockDashboardStore.openFilters.mockReset();
    mockDashboardStore.canReadEquipment.set(false);
    mockDashboardStore.canReadFacilities.set(false);

    component.onFilterToggle();
    expect(mockDashboardStore.openFilters).not.toHaveBeenCalled();
  });

  it('should delegate cancel, reset, and apply actions to the store', () => {
    const component = createComponent();

    component.onCancelFilters();
    component.onResetFilters();
    component.onApplyFilters();

    expect(mockDashboardStore.cancelDraftFilters).toHaveBeenCalledTimes(1);
    expect(mockDashboardStore.resetDraftFilters).toHaveBeenCalledTimes(1);
    expect(mockDashboardStore.applyDraftFilters).toHaveBeenCalledTimes(1);
  });
});
