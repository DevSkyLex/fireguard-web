import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { AssetGrowthTrendStore } from '@features/organization/state/organization-dashboard';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
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
  readonly queryHasError: WritableSignal<boolean>;
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly canReadEquipment: WritableSignal<boolean>;
  readonly canReadFacilities: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly selectedEquipmentType: WritableSignal<string | null>;
  readonly selectedEquipmentStatus: WritableSignal<string | null>;
  readonly selectedFacilityType: WritableSignal<string | null>;
  readonly selectedGranularity: WritableSignal<OrganizationDashboardGranularity>;
  readonly granularityOptions: WritableSignal<
    ReadonlyArray<{ readonly label: string; readonly value: OrganizationDashboardGranularity }>
  >;
  readonly draftDateRange: WritableSignal<Date[] | null>;
  readonly draftCompareEnabled: WritableSignal<boolean>;
  readonly draftEquipmentType: WritableSignal<string | null>;
  readonly draftEquipmentStatus: WritableSignal<string | null>;
  readonly draftFacilityType: WritableSignal<string | null>;
  readonly alignedTrendData: WritableSignal<{
    readonly labels: readonly string[];
    readonly datasets: readonly number[][];
  }>;
  readonly queryData: WritableSignal<MockAssetGrowthData | null>;
  readonly loadParams: WritableSignal<Record<string, unknown>>;
  readonly load: ReturnType<typeof vi.fn>;
  readonly openFilters: ReturnType<typeof vi.fn>;
  readonly cancelDraftFilters: ReturnType<typeof vi.fn>;
  readonly resetDraftFilters: ReturnType<typeof vi.fn>;
  readonly applyDraftFilters: ReturnType<typeof vi.fn>;
  readonly setGranularity: ReturnType<typeof vi.fn>;
  readonly setDraftDateRange: ReturnType<typeof vi.fn>;
  readonly setDraftCompareEnabled: ReturnType<typeof vi.fn>;
  readonly setDraftEquipmentType: ReturnType<typeof vi.fn>;
  readonly setDraftEquipmentStatus: ReturnType<typeof vi.fn>;
  readonly setDraftFacilityType: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
  readonly selectedOrganizationId: WritableSignal<string | null>;
};

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

const mockThemePort: ThemePort = {
  theme: signal<ThemeMode>('light'),
  resolvedTheme: signal<'light' | 'dark'>('light'),
  setTheme: vi.fn(),
};

const mockDashboardStore: MockAssetGrowthStore = {
  isQueryLoading: signal<boolean>(false),
  queryHasError: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  canReadEquipment: signal<boolean>(true),
  canReadFacilities: signal<boolean>(true),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
  selectedEquipmentType: signal<string | null>(null),
  selectedEquipmentStatus: signal<string | null>(null),
  selectedFacilityType: signal<string | null>(null),
  selectedGranularity: signal<OrganizationDashboardGranularity>('day'),
  granularityOptions: signal<
    ReadonlyArray<{ readonly label: string; readonly value: OrganizationDashboardGranularity }>
  >([
    { label: 'Daily', value: 'day' },
    { label: 'Weekly', value: 'week' },
    { label: 'Monthly', value: 'month' },
  ]),
  draftDateRange: signal<Date[] | null>(null),
  draftCompareEnabled: signal<boolean>(true),
  draftEquipmentType: signal<string | null>(null),
  draftEquipmentStatus: signal<string | null>(null),
  draftFacilityType: signal<string | null>(null),
  alignedTrendData: signal<{
    readonly labels: readonly string[];
    readonly datasets: readonly number[][];
  }>({ labels: [], datasets: [[], []] }),
  queryData: signal<MockAssetGrowthData | null>(null),
  loadParams: signal<Record<string, unknown>>({}),
  load: vi.fn(),
  openFilters: vi.fn(),
  cancelDraftFilters: vi.fn(),
  resetDraftFilters: vi.fn(),
  applyDraftFilters: vi.fn(),
  setGranularity: vi.fn(),
  setDraftDateRange: vi.fn(),
  setDraftCompareEnabled: vi.fn(),
  setDraftEquipmentType: vi.fn(),
  setDraftEquipmentStatus: vi.fn(),
  setDraftFacilityType: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
  selectedOrganizationId: signal<string | null>(MOCK_ORGANIZATION.id),
};

describe('AssetGrowthTrend', () => {
  beforeEach(() => {
    installMatchMediaMock();
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.queryHasError.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.canReadEquipment.set(true);
    mockDashboardStore.canReadFacilities.set(true);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.selectedEquipmentType.set(null);
    mockDashboardStore.selectedEquipmentStatus.set(null);
    mockDashboardStore.selectedFacilityType.set(null);
    mockDashboardStore.selectedGranularity.set('day');
    mockDashboardStore.draftDateRange.set(null);
    mockDashboardStore.draftCompareEnabled.set(true);
    mockDashboardStore.draftEquipmentType.set(null);
    mockDashboardStore.draftEquipmentStatus.set(null);
    mockDashboardStore.draftFacilityType.set(null);
    mockDashboardStore.alignedTrendData.set({ labels: [], datasets: [[], []] });
    mockDashboardStore.queryData.set(null);
    mockDashboardStore.loadParams.set({});
    mockDashboardStore.load.mockReset();
    mockDashboardStore.openFilters.mockReset();
    mockDashboardStore.cancelDraftFilters.mockReset();
    mockDashboardStore.resetDraftFilters.mockReset();
    mockDashboardStore.applyDraftFilters.mockReset();
    mockDashboardStore.setGranularity.mockReset();
    mockDashboardStore.setDraftDateRange.mockReset();
    mockDashboardStore.setDraftCompareEnabled.mockReset();
    mockDashboardStore.setDraftEquipmentType.mockReset();
    mockDashboardStore.setDraftEquipmentStatus.mockReset();
    mockDashboardStore.setDraftFacilityType.mockReset();
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [AssetGrowthTrend],
      providers: [provideRouter([]), { provide: THEME_PORT, useValue: mockThemePort }],
    })
      .overrideProvider(AssetGrowthTrendStore, { useValue: mockDashboardStore })
      .overrideProvider(ActiveOrganizationStore, { useValue: mockActiveOrganizationStore });
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
      routerLink: ['/organizations', MOCK_ORGANIZATION.id, 'equipments'],
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

  it('should render skeleton placeholders while the trend query is loading', () => {
    mockDashboardStore.isQueryLoading.set(true);
    const fixture = TestBed.createComponent(AssetGrowthTrend);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
  });

  it('should render the error state and allow retrying the query', () => {
    mockDashboardStore.queryHasError.set(true);
    const fixture = TestBed.createComponent(AssetGrowthTrend);
    fixture.detectChanges();

    const retryButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'app-asset-growth-chart button',
    );
    expect(retryButton).not.toBeNull();

    retryButton?.click();
    fixture.detectChanges();

    expect(mockDashboardStore.load).toHaveBeenCalledWith(mockDashboardStore.loadParams());
  });

  it('should open the filter drawer with the current draft values', () => {
    mockDashboardStore.isFilterDrawerVisible.set(true);
    const fixture = TestBed.createComponent(AssetGrowthTrend);
    fixture.detectChanges();

    // p-drawer renders its content via `appendTo: 'body'`, outside the fixture root.
    expect(document.body.textContent).toContain('Asset Growth Filters');
  });
});
