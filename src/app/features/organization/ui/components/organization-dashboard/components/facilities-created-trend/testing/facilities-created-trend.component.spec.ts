import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { FacilitiesCreatedTrendStore } from '@features/organization/state/organization-dashboard';
import { FacilitiesCreatedTrend } from '../facilities-created-trend.component';

type FacilitiesCreatedTrendHarness = {
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

type MockFacilitiesCreatedTrendStore = {
  readonly isQueryLoading: WritableSignal<boolean>;
  readonly isFilterDrawerVisible: WritableSignal<boolean>;
  readonly selectedDateRange: WritableSignal<Date[] | null>;
  readonly compareEnabled: WritableSignal<boolean>;
  readonly selectedFacilityType: WritableSignal<string | null>;
  readonly queryData: WritableSignal<OrganizationDashboardTrendOutput | null>;
  readonly openFilters: ReturnType<typeof vi.fn>;
  readonly cancelDraftFilters: ReturnType<typeof vi.fn>;
  readonly resetDraftFilters: ReturnType<typeof vi.fn>;
  readonly applyDraftFilters: ReturnType<typeof vi.fn>;
};

type MockActiveOrganizationStore = {
  readonly selectedOrganization: WritableSignal<OrganizationOutput | null>;
};

const MOCK_ORGANIZATION: OrganizationOutput = {
  '@id': '/organizations/org-facilities',
  '@type': 'Organization',
  id: 'org-facilities',
  name: 'Facilities Org',
  slug: 'facilities-org',
  isActive: true,
  memberCount: 11,
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

const mockDashboardStore: MockFacilitiesCreatedTrendStore = {
  isQueryLoading: signal<boolean>(false),
  isFilterDrawerVisible: signal<boolean>(false),
  selectedDateRange: signal<Date[] | null>(null),
  compareEnabled: signal<boolean>(true),
  selectedFacilityType: signal<string | null>(null),
  queryData: signal<OrganizationDashboardTrendOutput | null>(null),
  openFilters: vi.fn(),
  cancelDraftFilters: vi.fn(),
  resetDraftFilters: vi.fn(),
  applyDraftFilters: vi.fn(),
};

const mockActiveOrganizationStore: MockActiveOrganizationStore = {
  selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORGANIZATION),
};

describe('FacilitiesCreatedTrend', () => {
  beforeEach(() => {
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.isFilterDrawerVisible.set(false);
    mockDashboardStore.selectedDateRange.set(null);
    mockDashboardStore.compareEnabled.set(true);
    mockDashboardStore.selectedFacilityType.set(null);
    mockDashboardStore.queryData.set(null);
    mockDashboardStore.openFilters.mockReset();
    mockDashboardStore.cancelDraftFilters.mockReset();
    mockDashboardStore.resetDraftFilters.mockReset();
    mockDashboardStore.applyDraftFilters.mockReset();
    mockActiveOrganizationStore.selectedOrganization.set(MOCK_ORGANIZATION);

    TestBed.configureTestingModule({
      imports: [FacilitiesCreatedTrend],
      providers: [provideRouter([])],
    }).overrideComponent(FacilitiesCreatedTrend, {
      set: {
        imports: [MenuModule],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: FacilitiesCreatedTrendStore, useValue: mockDashboardStore },
          { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
        ],
      },
    });
  });

  function createComponent(): FacilitiesCreatedTrendHarness {
    const fixture = TestBed.createComponent(FacilitiesCreatedTrend);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as FacilitiesCreatedTrendHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should expose the facilities summary metric and quick link', () => {
    mockDashboardStore.queryData.set(createTrendOutput('facilities-created', [4, 2], [1, 1]));
    const component = createComponent();

    expect(component.summaryMetrics()).toHaveLength(1);
    expect(component.summaryMetrics()[0]?.label).toBe('Facilities Created');
    expect(component.summaryMetrics()[0]?.value).toBe('6');
    expect(component.menuItems()[0]).toMatchObject({
      label: 'View all facilities',
      routerLink: ['/organizations', MOCK_ORGANIZATION.id, 'facilities'],
    });
  });

  it('should count base and facility filters', () => {
    mockDashboardStore.selectedDateRange.set([new Date('2026-01-01'), new Date('2026-01-08')]);
    mockDashboardStore.compareEnabled.set(false);
    mockDashboardStore.selectedFacilityType.set('warehouse');
    const component = createComponent();

    expect(component.activeFilterCount()).toBe(3);
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
