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
import { NonConformitiesResolvedTrendStore } from '@features/organization/state/organization-dashboard';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
import { NonConformitiesResolvedTrend } from '../non-conformities-resolved-trend.component';

type NonConformitiesResolvedTrendHarness = {
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

type MockNonConformitiesResolvedTrendStore = {
  readonly isQueryLoading: WritableSignal<boolean>;
  readonly queryHasError: WritableSignal<boolean>;
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly selectedNonConformityStatus: WritableSignal<string | null>;
  readonly selectedNonConformitySeverity: WritableSignal<string | null>;
  readonly selectedGranularity: WritableSignal<OrganizationDashboardGranularity>;
  readonly granularityOptions: WritableSignal<
    ReadonlyArray<{ readonly label: string; readonly value: OrganizationDashboardGranularity }>
  >;
  readonly draftDateRange: WritableSignal<Date[] | null>;
  readonly draftCompareEnabled: WritableSignal<boolean>;
  readonly draftNonConformityStatus: WritableSignal<string | null>;
  readonly draftNonConformitySeverity: WritableSignal<string | null>;
  readonly queryData: WritableSignal<OrganizationDashboardTrendOutput | null>;
  readonly loadParams: WritableSignal<Record<string, unknown>>;
  readonly load: ReturnType<typeof vi.fn>;
  readonly openFilters: ReturnType<typeof vi.fn>;
  readonly cancelDraftFilters: ReturnType<typeof vi.fn>;
  readonly resetDraftFilters: ReturnType<typeof vi.fn>;
  readonly applyDraftFilters: ReturnType<typeof vi.fn>;
  readonly setGranularity: ReturnType<typeof vi.fn>;
  readonly setDraftDateRange: ReturnType<typeof vi.fn>;
  readonly setDraftCompareEnabled: ReturnType<typeof vi.fn>;
  readonly setDraftNonConformityStatus: ReturnType<typeof vi.fn>;
  readonly setDraftNonConformitySeverity: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
};

const MOCK_ORGANIZATION: OrganizationOutput = {
  '@id': '/organizations/org-nc-resolved',
  '@type': 'Organization',
  id: 'org-nc-resolved',
  name: 'Resolved NC Org',
  slug: 'resolved-nc-org',
  isActive: true,
  memberCount: 10,
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

const mockDashboardStore: MockNonConformitiesResolvedTrendStore = {
  isQueryLoading: signal<boolean>(false),
  queryHasError: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
  selectedNonConformityStatus: signal<string | null>(null),
  selectedNonConformitySeverity: signal<string | null>(null),
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
  draftNonConformityStatus: signal<string | null>(null),
  draftNonConformitySeverity: signal<string | null>(null),
  queryData: signal<OrganizationDashboardTrendOutput | null>(null),
  loadParams: signal<Record<string, unknown>>({}),
  load: vi.fn(),
  openFilters: vi.fn(),
  cancelDraftFilters: vi.fn(),
  resetDraftFilters: vi.fn(),
  applyDraftFilters: vi.fn(),
  setGranularity: vi.fn(),
  setDraftDateRange: vi.fn(),
  setDraftCompareEnabled: vi.fn(),
  setDraftNonConformityStatus: vi.fn(),
  setDraftNonConformitySeverity: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
};

describe('NonConformitiesResolvedTrend', () => {
  beforeEach(() => {
    installMatchMediaMock();
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.queryHasError.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.selectedNonConformityStatus.set(null);
    mockDashboardStore.selectedNonConformitySeverity.set(null);
    mockDashboardStore.selectedGranularity.set('day');
    mockDashboardStore.draftDateRange.set(null);
    mockDashboardStore.draftCompareEnabled.set(true);
    mockDashboardStore.draftNonConformityStatus.set(null);
    mockDashboardStore.draftNonConformitySeverity.set(null);
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
    mockDashboardStore.setDraftNonConformityStatus.mockReset();
    mockDashboardStore.setDraftNonConformitySeverity.mockReset();
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [NonConformitiesResolvedTrend],
      providers: [provideRouter([]), { provide: THEME_PORT, useValue: mockThemePort }],
    })
      .overrideProvider(NonConformitiesResolvedTrendStore, { useValue: mockDashboardStore })
      .overrideProvider(ActiveOrganizationStore, { useValue: mockActiveOrganizationStore });
  });

  function createComponent(): NonConformitiesResolvedTrendHarness {
    const fixture = TestBed.createComponent(NonConformitiesResolvedTrend);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as NonConformitiesResolvedTrendHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should expose the resolved non-conformities summary metric and quick link', () => {
    mockDashboardStore.queryData.set(createTrendOutput('nc-resolved', [4, 1], [1, 1]));
    const component = createComponent();

    expect(component.summaryMetrics()).toHaveLength(1);
    expect(component.summaryMetrics()[0]?.label).toBe('Resolved NC');
    expect(component.summaryMetrics()[0]?.value).toBe('5');
    expect(component.menuItems()[0]).toMatchObject({
      label: 'View all non-conformities',
      routerLink: ['/organizations', MOCK_ORGANIZATION.id, 'inspections'],
    });
  });

  it('should count base and non-conformity filters', () => {
    mockDashboardStore.selectedDateRange.set([new Date('2026-01-01'), new Date('2026-01-08')]);
    mockDashboardStore.compareEnabled.set(false);
    mockDashboardStore.selectedNonConformityStatus.set('resolved');
    mockDashboardStore.selectedNonConformitySeverity.set('major');
    const component = createComponent();

    expect(component.activeFilterCount()).toBe(4);
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
    const fixture = TestBed.createComponent(NonConformitiesResolvedTrend);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
  });

  it('should render the error state and allow retrying the query', () => {
    mockDashboardStore.queryHasError.set(true);
    const fixture = TestBed.createComponent(NonConformitiesResolvedTrend);
    fixture.detectChanges();

    const retryButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'app-non-conformities-resolved-chart button',
    );
    expect(retryButton).not.toBeNull();

    retryButton?.click();
    fixture.detectChanges();

    expect(mockDashboardStore.load).toHaveBeenCalledWith(mockDashboardStore.loadParams());
  });

  it('should open the filter drawer with the current draft values', () => {
    mockDashboardStore.isFilterDrawerVisible.set(true);
    const fixture = TestBed.createComponent(NonConformitiesResolvedTrend);
    fixture.detectChanges();

    // p-drawer renders its content via `appendTo: 'body'`, outside the fixture root.
    expect(document.body.textContent).toContain('Non-Conformities Resolved Filters');
  });
});
