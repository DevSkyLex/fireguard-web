import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import {
  AssetGrowthTrendStore,
  DashboardStore,
  OverviewTrendStore,
} from '@features/organization/state/organization-dashboard';
import { LineChart } from '@shared/chart';
import { OrganizationDashboardPage } from '../organization-dashboard-page.component';

const RECENT: OrganizationDashboardRecentIntervention = {
  id: 'intervention-1',
  number: 42,
  name: 'Inspect the north wing',
  status: 'in_progress',
  priority: 'normal',
  siteId: 'site-1',
  siteName: 'North wing',
  responsibleId: null,
  responsibleName: null,
  responsibleAvatarUrl: null,
  dueAt: '2026-09-12T12:00:00Z',
  updatedAt: '2026-09-12T10:00:00Z',
};

describe('OrganizationDashboardPage', () => {
  let fixture: ComponentFixture<OrganizationDashboardPage>;
  const mobileInteractionMode = signal(false);
  const canReadInterventions = signal(true);
  const queryHasError = signal(false);
  const overview = {
    queryData: signal(null),
    queryHasError: signal(false),
    queryError: signal(null),
    isQueryLoading: signal(false),
    alignedTrendData: signal({ buckets: [], labels: [], datasets: [[], [], []] }),
    activate: vi.fn(),
    setDateRange: vi.fn(),
    setGranularity: vi.fn(),
    setCompareEnabled: vi.fn(),
  };
  const assets = {
    ...overview,
    alignedTrendData: signal({ buckets: [], labels: [], datasets: [[], []] }),
    activate: vi.fn(),
    canReadEquipment: signal(false),
    canReadFacilities: signal(false),
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const find = (id: string): HTMLElement | null =>
    root().querySelector('[data-testid="' + id + '"]');

  beforeEach(() => {
    mobileInteractionMode.set(false);
    canReadInterventions.set(true);
    queryHasError.set(false);
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobileInteractionMode,
            interactionMode: () => (mobileInteractionMode() ? 'mobile' : 'desktop'),
          },
        },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: signal('org-1') },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: (permission: string): boolean =>
              permission === ORGANIZATION_PERMISSION.INTERVENTIONS_READ && canReadInterventions(),
          },
        },
      ],
    });
    TestBed.overrideComponent(LineChart, { set: { template: '' } });
    TestBed.overrideComponent(OrganizationDashboardPage, {
      remove: { providers: [DashboardStore, OverviewTrendStore, AssetGrowthTrendStore] },
      add: {
        providers: [
          {
            provide: DashboardStore,
            useValue: {
              queryData: signal({ recentInterventions: [RECENT] }),
              queryHasError,
              queryError: signal(null),
              isQueryLoading: signal(false),
            },
          },
          { provide: OverviewTrendStore, useValue: overview },
          { provide: AssetGrowthTrendStore, useValue: assets },
        ],
      },
    });
  });

  async function render(mobile: boolean): Promise<void> {
    mobileInteractionMode.set(mobile);
    fixture = TestBed.createComponent(OrganizationDashboardPage);
    await fixture.whenStable();
  }

  it.each([true, false])(
    'keeps the documented KPI, analysis and recent-work order when mobile is %s',
    async (mobile: boolean) => {
      await render(mobile);
      const kpis = find('org-dashboard-kpis');
      const trends = find('org-dashboard-trends');
      const recent = find('org-dashboard-recent');
      const cards = Array.from(kpis?.querySelectorAll('[hlmCard]') ?? []);
      expect(cards.length).toBeGreaterThan(0);
      expect(
        cards.every((card) => card.getAttribute('data-size') === (mobile ? 'sm' : 'default')),
      ).toBe(true);
      expect(
        kpis && trends && kpis.compareDocumentPosition(trends) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        trends &&
          recent &&
          trends.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(find('org-dashboard-alerts')).not.toBeNull();
      expect(root().querySelectorAll('[data-testid="org-dashboard-recent"]')).toHaveLength(1);
    },
  );

  it('retains the native desktop table composition', async () => {
    await render(false);
    expect(find('org-dashboard-mobile-work')).toBeNull();
    expect(find('org-dashboard-mobile-analysis')).toBeNull();
    const recent = find('org-dashboard-recent');
    expect(
      recent
        ?.querySelector('table')
        ?.closest('[hlmTableContainer]')
        ?.classList.contains('desktop-ui:@[700px]/recent:block'),
    ).toBe(true);
  });

  it('keeps intervention permissions authoritative for recent work', async () => {
    canReadInterventions.set(false);
    await render(true);
    expect(find('org-dashboard-recent')).toBeNull();
  });

  it('does not offer stale recent work when the aggregate query fails', async () => {
    queryHasError.set(true);
    await render(true);
    expect(find('org-dashboard-recent')).toBeNull();
  });
});
