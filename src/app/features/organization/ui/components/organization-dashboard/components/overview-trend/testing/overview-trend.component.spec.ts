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
import { OverviewTrendStore } from '@features/organization/state/organization-dashboard';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
import { OverviewTrend } from '../overview-trend.component';

type OverviewTrendData = {
  readonly inspections: OrganizationDashboardTrendOutput;
  readonly ncOpened: OrganizationDashboardTrendOutput;
  readonly ncResolved: OrganizationDashboardTrendOutput;
};

type OverviewTrendHarness = {
  readonly activeFilterCount: () => number;
  readonly summaryMetrics: () => ReadonlyArray<{
    readonly label: string;
    readonly value: string;
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

type MockOverviewTrendStore = {
  readonly isQueryLoading: WritableSignal<boolean>;
  readonly queryHasError: WritableSignal<boolean>;
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly selectedGranularity: WritableSignal<OrganizationDashboardGranularity>;
  readonly granularityOptions: WritableSignal<
    ReadonlyArray<{ readonly label: string; readonly value: OrganizationDashboardGranularity }>
  >;
  readonly draftDateRange: WritableSignal<Date[] | null>;
  readonly draftCompareEnabled: WritableSignal<boolean>;
  readonly alignedTrendData: WritableSignal<{
    readonly labels: readonly string[];
    readonly datasets: readonly number[][];
  }>;
  readonly queryData: WritableSignal<OverviewTrendData | null>;
  readonly loadParams: WritableSignal<Record<string, unknown>>;
  readonly load: ReturnType<typeof vi.fn>;
  readonly openFilters: ReturnType<typeof vi.fn>;
  readonly cancelDraftFilters: ReturnType<typeof vi.fn>;
  readonly resetDraftFilters: ReturnType<typeof vi.fn>;
  readonly applyDraftFilters: ReturnType<typeof vi.fn>;
  readonly setGranularity: ReturnType<typeof vi.fn>;
  readonly setDraftDateRange: ReturnType<typeof vi.fn>;
  readonly setDraftCompareEnabled: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
  readonly selectedOrganizationId: WritableSignal<string | null>;
};

const MOCK_ORGANIZATION: OrganizationOutput = {
  '@id': '/organizations/org-overview',
  '@type': 'Organization',
  id: 'org-overview',
  name: 'Overview Org',
  slug: 'overview-org',
  isActive: true,
  memberCount: 14,
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

const mockThemePort: ThemePort = {
  theme: signal<ThemeMode>('light'),
  resolvedTheme: signal<'light' | 'dark'>('light'),
  setTheme: vi.fn(),
};

const mockDashboardStore: MockOverviewTrendStore = {
  isQueryLoading: signal<boolean>(false),
  queryHasError: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
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
  alignedTrendData: signal<{
    readonly labels: readonly string[];
    readonly datasets: readonly number[][];
  }>({
    labels: [],
    datasets: [[], [], []],
  }),
  queryData: signal<OverviewTrendData | null>(null),
  loadParams: signal<Record<string, unknown>>({}),
  load: vi.fn(),
  openFilters: vi.fn(),
  cancelDraftFilters: vi.fn(),
  resetDraftFilters: vi.fn(),
  applyDraftFilters: vi.fn(),
  setGranularity: vi.fn(),
  setDraftDateRange: vi.fn(),
  setDraftCompareEnabled: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
  selectedOrganizationId: signal<string | null>(MOCK_ORGANIZATION.id),
};

describe('OverviewTrend', () => {
  beforeEach(() => {
    installMatchMediaMock();
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.queryHasError.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.selectedGranularity.set('day');
    mockDashboardStore.draftDateRange.set(null);
    mockDashboardStore.draftCompareEnabled.set(true);
    mockDashboardStore.alignedTrendData.set({ labels: [], datasets: [[], [], []] });
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
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [OverviewTrend],
      providers: [provideRouter([]), { provide: THEME_PORT, useValue: mockThemePort }],
    })
      .overrideProvider(OverviewTrendStore, { useValue: mockDashboardStore })
      .overrideProvider(ActiveOrganizationStore, { useValue: mockActiveOrganizationStore });
  });

  function createComponent(): OverviewTrendHarness {
    const fixture = TestBed.createComponent(OverviewTrend);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as OverviewTrendHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should expose overview summary metrics and the inspections quick link', () => {
    mockDashboardStore.alignedTrendData.set({
      labels: ['Apr 1', 'Apr 2'],
      datasets: [
        [6, 4],
        [2, 2],
        [1, 2],
      ],
    });
    mockDashboardStore.queryData.set({
      inspections: createTrendOutput('inspections', [6, 4], [3, 2]),
      ncOpened: createTrendOutput('nc-opened', [2, 2], [1, 1]),
      ncResolved: createTrendOutput('nc-resolved', [1, 2], [1, 0]),
    });
    const component = createComponent();

    expect(component.summaryMetrics().map((metric) => metric.label)).toEqual([
      'Inspections',
      'Opened NC',
      'Resolved NC',
      'Net Pressure',
    ]);
    expect(component.summaryMetrics().map((metric) => metric.value)).toEqual(['10', '4', '3', '1']);
    expect(component.menuItems()[0]).toMatchObject({
      label: 'View all inspections',
      routerLink: ['/organizations', MOCK_ORGANIZATION.id, 'inspections'],
    });
  });

  it('should count only the base dashboard filters', () => {
    mockDashboardStore.selectedDateRange.set([new Date('2026-01-01'), new Date('2026-01-08')]);
    mockDashboardStore.compareEnabled.set(false);
    const component = createComponent();

    expect(component.activeFilterCount()).toBe(2);
  });

  it('should delegate filter actions to the store', () => {
    const component = createComponent();

    component.onFilterToggle();
    component.onCancelFilters();
    component.onResetFilters();
    component.onApplyFilters();

    expect(mockDashboardStore.openFilters).toHaveBeenCalledTimes(1);
    expect(mockDashboardStore.cancelDraftFilters).toHaveBeenCalledTimes(1);
    expect(mockDashboardStore.resetDraftFilters).toHaveBeenCalledTimes(1);
    expect(mockDashboardStore.applyDraftFilters).toHaveBeenCalledTimes(1);
  });

  it('should render skeleton placeholders while the trend query is loading', () => {
    mockDashboardStore.isQueryLoading.set(true);
    const fixture = TestBed.createComponent(OverviewTrend);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
  });

  it('should render the error state and allow retrying the query', () => {
    mockDashboardStore.queryHasError.set(true);
    const fixture = TestBed.createComponent(OverviewTrend);
    fixture.detectChanges();

    const retryButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'app-overview-chart button',
    );
    expect(retryButton).not.toBeNull();

    retryButton?.click();
    fixture.detectChanges();

    expect(mockDashboardStore.load).toHaveBeenCalledWith(mockDashboardStore.loadParams());
  });

  it('should open the filter drawer with the current draft values', () => {
    mockDashboardStore.isFilterDrawerVisible.set(true);
    mockDashboardStore.draftDateRange.set([new Date('2026-01-01'), new Date('2026-01-08')]);
    const fixture = TestBed.createComponent(OverviewTrend);
    fixture.detectChanges();

    // p-drawer renders its content via `appendTo: 'body'`, outside the fixture root.
    expect(document.body.textContent).toContain('Operational Flow Filters');
  });
});
