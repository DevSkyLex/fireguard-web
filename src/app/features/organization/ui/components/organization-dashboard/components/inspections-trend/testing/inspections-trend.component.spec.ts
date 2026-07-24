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
import { InspectionsTrendStore } from '@features/organization/state/organization-dashboard';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
import { InspectionsTrend } from '../inspections-trend.component';

type InspectionsTrendHarness = {
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

type MockInspectionsTrendStore = {
  readonly isQueryLoading: WritableSignal<boolean>;
  readonly queryHasError: WritableSignal<boolean>;
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly selectedInspectionStatus: WritableSignal<string | null>;
  readonly selectedInspectionResult: WritableSignal<string | null>;
  readonly selectedInspectorType: WritableSignal<string | null>;
  readonly selectedGranularity: WritableSignal<OrganizationDashboardGranularity>;
  readonly granularityOptions: WritableSignal<
    ReadonlyArray<{ readonly label: string; readonly value: OrganizationDashboardGranularity }>
  >;
  readonly draftDateRange: WritableSignal<Date[] | null>;
  readonly draftCompareEnabled: WritableSignal<boolean>;
  readonly draftInspectionStatus: WritableSignal<string | null>;
  readonly draftInspectionResult: WritableSignal<string | null>;
  readonly draftInspectorType: WritableSignal<string | null>;
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
  readonly setDraftInspectionStatus: ReturnType<typeof vi.fn>;
  readonly setDraftInspectionResult: ReturnType<typeof vi.fn>;
  readonly setDraftInspectorType: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
};

const MOCK_ORGANIZATION: OrganizationOutput = {
  '@id': '/organizations/org-inspections',
  '@type': 'Organization',
  id: 'org-inspections',
  name: 'Inspections Org',
  slug: 'inspections-org',
  isActive: true,
  memberCount: 9,
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

const mockDashboardStore: MockInspectionsTrendStore = {
  isQueryLoading: signal<boolean>(false),
  queryHasError: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
  selectedInspectionStatus: signal<string | null>(null),
  selectedInspectionResult: signal<string | null>(null),
  selectedInspectorType: signal<string | null>(null),
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
  draftInspectionStatus: signal<string | null>(null),
  draftInspectionResult: signal<string | null>(null),
  draftInspectorType: signal<string | null>(null),
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
  setDraftInspectionStatus: vi.fn(),
  setDraftInspectionResult: vi.fn(),
  setDraftInspectorType: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
};

describe('InspectionsTrend', () => {
  beforeEach(() => {
    installMatchMediaMock();
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.queryHasError.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.selectedInspectionStatus.set(null);
    mockDashboardStore.selectedInspectionResult.set(null);
    mockDashboardStore.selectedInspectorType.set(null);
    mockDashboardStore.selectedGranularity.set('day');
    mockDashboardStore.draftDateRange.set(null);
    mockDashboardStore.draftCompareEnabled.set(true);
    mockDashboardStore.draftInspectionStatus.set(null);
    mockDashboardStore.draftInspectionResult.set(null);
    mockDashboardStore.draftInspectorType.set(null);
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
    mockDashboardStore.setDraftInspectionStatus.mockReset();
    mockDashboardStore.setDraftInspectionResult.mockReset();
    mockDashboardStore.setDraftInspectorType.mockReset();
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [InspectionsTrend],
      providers: [provideRouter([]), { provide: THEME_PORT, useValue: mockThemePort }],
    })
      .overrideProvider(InspectionsTrendStore, { useValue: mockDashboardStore })
      .overrideProvider(ActiveOrganizationStore, { useValue: mockActiveOrganizationStore });
  });

  function createComponent(): InspectionsTrendHarness {
    const fixture = TestBed.createComponent(InspectionsTrend);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InspectionsTrendHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should expose the inspections summary metric and quick link', () => {
    mockDashboardStore.queryData.set(createTrendOutput('inspections', [7, 5], [3, 2]));
    const component = createComponent();

    expect(component.summaryMetrics()).toHaveLength(1);
    expect(component.summaryMetrics()[0]?.label).toBe('Inspections');
    expect(component.summaryMetrics()[0]?.value).toBe('12');
    expect(component.menuItems()[0]).toMatchObject({
      label: 'View all inspections',
      routerLink: ['/organizations', MOCK_ORGANIZATION.id, 'inspections'],
    });
  });

  it('should count base and inspection filters', () => {
    mockDashboardStore.selectedDateRange.set([new Date('2026-01-01'), new Date('2026-01-08')]);
    mockDashboardStore.compareEnabled.set(false);
    mockDashboardStore.selectedInspectionStatus.set('completed');
    mockDashboardStore.selectedInspectionResult.set('passed');
    mockDashboardStore.selectedInspectorType.set('internal');
    const component = createComponent();

    expect(component.activeFilterCount()).toBe(5);
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
    const fixture = TestBed.createComponent(InspectionsTrend);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
  });

  it('should render the error state and allow retrying the query', () => {
    mockDashboardStore.queryHasError.set(true);
    const fixture = TestBed.createComponent(InspectionsTrend);
    fixture.detectChanges();

    const retryButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'app-inspections-chart button',
    );
    expect(retryButton).not.toBeNull();

    retryButton?.click();
    fixture.detectChanges();

    expect(mockDashboardStore.load).toHaveBeenCalledWith(mockDashboardStore.loadParams());
  });

  it('should open the filter drawer with the current draft values', () => {
    mockDashboardStore.isFilterDrawerVisible.set(true);
    const fixture = TestBed.createComponent(InspectionsTrend);
    fixture.detectChanges();

    // p-drawer renders its content via `appendTo: 'body'`, outside the fixture root.
    expect(document.body.textContent).toContain('Inspections Filters');
  });
});
