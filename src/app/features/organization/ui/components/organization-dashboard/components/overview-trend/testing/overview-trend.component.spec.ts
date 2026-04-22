import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OverviewTrendStore } from '@features/organization/state/organization-dashboard';
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
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly alignedTrendData: WritableSignal<{ readonly datasets: readonly number[][] }>;
  readonly queryData: WritableSignal<OverviewTrendData | null>;
  readonly openFilters: ReturnType<typeof vi.fn>;
  readonly cancelDraftFilters: ReturnType<typeof vi.fn>;
  readonly resetDraftFilters: ReturnType<typeof vi.fn>;
  readonly applyDraftFilters: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
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

const mockDashboardStore: MockOverviewTrendStore = {
  isQueryLoading: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
  alignedTrendData: signal<{ readonly datasets: readonly number[][] }>({
    datasets: [[], [], []],
  }),
  queryData: signal<OverviewTrendData | null>(null),
  openFilters: vi.fn(),
  cancelDraftFilters: vi.fn(),
  resetDraftFilters: vi.fn(),
  applyDraftFilters: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
};

describe('OverviewTrend', () => {
  beforeEach(() => {
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.alignedTrendData.set({ datasets: [[], [], []] });
    mockDashboardStore.queryData.set(null);
    mockDashboardStore.openFilters.mockReset();
    mockDashboardStore.cancelDraftFilters.mockReset();
    mockDashboardStore.resetDraftFilters.mockReset();
    mockDashboardStore.applyDraftFilters.mockReset();
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [OverviewTrend],
      providers: [provideRouter([])],
    }).overrideComponent(OverviewTrend, {
      set: {
        imports: [MenuModule],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: OverviewTrendStore, useValue: mockDashboardStore },
          { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
        ],
      },
    });
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
});
