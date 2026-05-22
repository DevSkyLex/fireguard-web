import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InspectionQualityTrendStore } from '@features/organization/state/organization-dashboard';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
import { InspectionQualityTrend } from '../inspection-quality-trend.component';

type InspectionQualityTrendData = {
  readonly inspections: OrganizationDashboardTrendOutput;
  readonly ncOpened: OrganizationDashboardTrendOutput;
};

type InspectionQualityTrendHarness = {
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

type MockInspectionQualityTrendStore = {
  readonly isQueryLoading: WritableSignal<boolean>;
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly selectedInspectionStatus: WritableSignal<string | null>;
  readonly selectedInspectionResult: WritableSignal<string | null>;
  readonly selectedInspectorType: WritableSignal<string | null>;
  readonly selectedNonConformitySeverity: WritableSignal<string | null>;
  readonly rateSeriesData: WritableSignal<readonly number[]>;
  readonly queryData: WritableSignal<InspectionQualityTrendData | null>;
  readonly openFilters: ReturnType<typeof vi.fn>;
  readonly cancelDraftFilters: ReturnType<typeof vi.fn>;
  readonly resetDraftFilters: ReturnType<typeof vi.fn>;
  readonly applyDraftFilters: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
};

const MOCK_ORGANIZATION: OrganizationOutput = {
  '@id': '/organizations/org-inspection-quality',
  '@type': 'Organization',
  id: 'org-inspection-quality',
  name: 'Inspection Quality Org',
  slug: 'inspection-quality-org',
  isActive: true,
  memberCount: 13,
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

const mockDashboardStore: MockInspectionQualityTrendStore = {
  isQueryLoading: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
  selectedInspectionStatus: signal<string | null>(null),
  selectedInspectionResult: signal<string | null>(null),
  selectedInspectorType: signal<string | null>(null),
  selectedNonConformitySeverity: signal<string | null>(null),
  rateSeriesData: signal<readonly number[]>([]),
  queryData: signal<InspectionQualityTrendData | null>(null),
  openFilters: vi.fn(),
  cancelDraftFilters: vi.fn(),
  resetDraftFilters: vi.fn(),
  applyDraftFilters: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
};

describe('InspectionQualityTrend', () => {
  beforeEach(() => {
    installMatchMediaMock();
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.selectedInspectionStatus.set(null);
    mockDashboardStore.selectedInspectionResult.set(null);
    mockDashboardStore.selectedInspectorType.set(null);
    mockDashboardStore.selectedNonConformitySeverity.set(null);
    mockDashboardStore.rateSeriesData.set([]);
    mockDashboardStore.queryData.set(null);
    mockDashboardStore.openFilters.mockReset();
    mockDashboardStore.cancelDraftFilters.mockReset();
    mockDashboardStore.resetDraftFilters.mockReset();
    mockDashboardStore.applyDraftFilters.mockReset();
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [InspectionQualityTrend],
      providers: [provideRouter([])],
    }).overrideComponent(InspectionQualityTrend, {
      set: {
        imports: [MenuModule],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: InspectionQualityTrendStore, useValue: mockDashboardStore },
          { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
        ],
      },
    });
  });

  function createComponent(): InspectionQualityTrendHarness {
    const fixture = TestBed.createComponent(InspectionQualityTrend);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InspectionQualityTrendHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should expose quality metrics and the inspections quick link', () => {
    mockDashboardStore.rateSeriesData.set([10, 25]);
    mockDashboardStore.queryData.set({
      inspections: createTrendOutput('inspections', [6, 4], [3, 2]),
      ncOpened: createTrendOutput('nc-opened', [1, 1], [1, 1]),
    });
    const component = createComponent();

    expect(component.summaryMetrics().map((metric) => metric.label)).toEqual([
      'Inspections',
      'Opened NC',
      'NC Rate',
      'Rate Shift',
    ]);
    expect(component.summaryMetrics().map((metric) => metric.value)).toEqual([
      '10',
      '2',
      '20%',
      '+15%',
    ]);
    expect(component.summaryMetrics()[2]?.comparison).not.toBeNull();
    expect(component.menuItems()[0]).toMatchObject({
      label: 'View all inspections',
      routerLink: ['/organizations', MOCK_ORGANIZATION.id, 'inspections'],
    });
  });

  it('should count base and quality filters', () => {
    mockDashboardStore.selectedDateRange.set([new Date('2026-01-01'), new Date('2026-01-08')]);
    mockDashboardStore.compareEnabled.set(false);
    mockDashboardStore.selectedInspectionStatus.set('completed');
    mockDashboardStore.selectedInspectionResult.set('passed');
    mockDashboardStore.selectedInspectorType.set('internal');
    mockDashboardStore.selectedNonConformitySeverity.set('major');
    const component = createComponent();

    expect(component.activeFilterCount()).toBe(6);
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
