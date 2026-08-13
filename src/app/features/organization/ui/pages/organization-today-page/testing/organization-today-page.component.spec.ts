import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionOutput,
  InterventionQueue,
} from '@features/organization/features/interventions/models';
import type {
  OrganizationDashboardAlert,
  OrganizationDashboardOutput,
  OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationTodayStore } from '@features/organization/state/organization-today';
import { OrganizationTodayPage } from '../organization-today-page.component';

/**
 * Builds the minimum of an intervention the page reads.
 */
function intervention(id: string, dueAt: string | null): InterventionOutput {
  return { id, number: 101, name: 'Check the riser', dueAt } as InterventionOutput;
}

/**
 * Builds an empty queue for a key the test does not care about.
 */
function emptyQueue(): InterventionQueue {
  return { key: 'overdue', total: 0, items: [] } as InterventionQueue;
}

/**
 * Builds one recently-updated intervention row.
 */
function recentIntervention(
  overrides: Partial<OrganizationDashboardRecentIntervention> = {},
): OrganizationDashboardRecentIntervention {
  return {
    id: 'i-recent-1',
    number: 202,
    name: 'Replace extinguisher',
    status: 'in_progress',
    priority: 'high',
    siteId: 'site-1',
    siteName: 'Main warehouse',
    responsibleId: 'member-1',
    responsibleName: 'Jamie Rivera',
    responsibleAvatarUrl: null,
    dueAt: null,
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('OrganizationTodayPage', () => {
  let fixture: ComponentFixture<OrganizationTodayPage>;
  let overdue: WritableSignal<InterventionQueue>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let load: ReturnType<typeof vi.fn>;
  let loadUnsynced: ReturnType<typeof vi.fn>;
  let navigate: MockInstance;

  let dashboardQueryData: WritableSignal<OrganizationDashboardOutput | null>;
  let dashboardQueryHasError: WritableSignal<boolean>;
  let dashboardIsQueryLoading: WritableSignal<boolean>;
  let dashboardAlerts: WritableSignal<readonly OrganizationDashboardAlert[]>;
  let dashboardRecentInterventions: WritableSignal<
    readonly OrganizationDashboardRecentIntervention[]
  >;
  let dashboardInspectionsComparison: WritableSignal<{
    readonly value: string | number | null;
    readonly direction: string | null;
  } | null>;

  beforeEach(async () => {
    overdue = signal<InterventionQueue>(emptyQueue());
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.INTERVENTIONS_READ,
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
    ]);
    load = vi.fn();
    loadUnsynced = vi.fn();

    const todayStoreMock = {
      overdue,
      changesRequested: signal<InterventionQueue>(emptyQueue()),
      awaitingReview: signal<InterventionQueue>(emptyQueue()),
      upcoming: signal<InterventionQueue>(emptyQueue()),
      unsynced: signal([]),
      isLoading: signal(false),
      hasError: signal(false),
      isAllClear: signal(false),
      loadParams: signal<string | undefined>('org-1'),
      load,
      loadUnsynced,
    };

    dashboardQueryData = signal<OrganizationDashboardOutput | null>(null);
    dashboardQueryHasError = signal<boolean>(false);
    dashboardIsQueryLoading = signal<boolean>(false);
    dashboardAlerts = signal<readonly OrganizationDashboardAlert[]>([]);
    dashboardRecentInterventions = signal<readonly OrganizationDashboardRecentIntervention[]>([]);
    dashboardInspectionsComparison = signal<{
      readonly value: string | number | null;
      readonly direction: string | null;
    } | null>(null);

    const dashboardStoreMock = {
      queryData: dashboardQueryData,
      queryHasError: dashboardQueryHasError,
      isQueryLoading: dashboardIsQueryLoading,
      alerts: dashboardAlerts,
      recentInterventions: dashboardRecentInterventions,
      inspectionsComparison: dashboardInspectionsComparison,
      load: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId: signal<string | null>('org-1'),
            selectedOrganization: signal({ name: 'Acme Corp' }),
            isLoadingOrganization: signal(false),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            permissions,
            hasPermission: (permission: string): boolean => permissions().includes(permission),
          },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationTodayPage, {
      set: {
        providers: [
          { provide: OrganizationTodayStore, useValue: todayStoreMock },
          { provide: DashboardStore, useValue: dashboardStoreMock },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(OrganizationTodayPage);
    await fixture.whenStable();
  });

  it('should name the organization it reports on', () => {
    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
  });

  it('should compute how late an overdue intervention is', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    overdue.set({ key: 'overdue', total: 1, items: [intervention('i-1', threeDaysAgo)] });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('3 days late');
  });

  it('should leave an intervention without a due date unannotated', async () => {
    overdue.set({ key: 'overdue', total: 1, items: [intervention('i-1', null)] });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('days late');
  });

  it('should open one intervention under the routed organization', () => {
    fixture.componentInstance['openIntervention'](intervention('i-1', null));

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-1']);
  });

  it('should open the full intervention list', () => {
    fixture.componentInstance['openInterventions']();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions'], {
      queryParams: undefined,
    });
  });

  it('should start an intervention with the drawer already open', () => {
    fixture.componentInstance['startIntervention']();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions'], {
      queryParams: { create: '1' },
    });
  });

  it('should re-run both queue loads on retry', () => {
    fixture.componentInstance['retryQueues']();

    expect(load).toHaveBeenCalledWith('org-1');
    expect(loadUnsynced).toHaveBeenCalledWith('org-1');
  });

  it('should hide the queues from a member who cannot read interventions', async () => {
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-organization-today-queue')).toBeNull();
  });

  it('should render the KPI row from the dashboard overview', async () => {
    dashboardQueryData.set({
      overview: {
        interventions: { summary: [{ key: 'open', value: 5 }] },
        nonConformities: { summary: [{ key: 'open', value: 3 }] },
        inspections: { summary: [{ key: 'closed', value: 12 }] },
        equipment: { summary: [{ key: 'underMaintenance', value: 2 }] },
      },
    } as unknown as OrganizationDashboardOutput);
    await fixture.whenStable();

    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('5');
    expect(text).toContain('3');
    expect(text).toContain('12');
    expect(text).toContain('2');
  });

  it('should attach the matching comparison delta only to the inspections-completed tile', async () => {
    dashboardQueryData.set({
      overview: {
        interventions: { summary: [{ key: 'open', value: 5 }] },
        nonConformities: { summary: [{ key: 'open', value: 3 }] },
        inspections: { summary: [{ key: 'closed', value: 12 }] },
        equipment: { summary: [{ key: 'underMaintenance', value: 2 }] },
      },
    } as unknown as OrganizationDashboardOutput);
    dashboardInspectionsComparison.set({ value: '4', direction: 'up' });
    await fixture.whenStable();

    const tiles = fixture.componentInstance['kpiTiles']();

    expect(tiles.find((tile) => tile.id === 'inspections-completed')?.delta).toEqual({
      value: 4,
      direction: 'up',
      positiveIsGood: true,
    });
    expect(tiles.find((tile) => tile.id === 'open-interventions')?.delta).toBeNull();
    expect(tiles.find((tile) => tile.id === 'open-non-conformities')?.delta).toBeNull();
    expect(tiles.find((tile) => tile.id === 'equipment-under-maintenance')?.delta).toBeNull();
  });

  it('should hide the open-interventions KPI tile from a member who cannot read interventions', async () => {
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    dashboardQueryData.set({
      overview: { interventions: { summary: [{ key: 'open', value: 5 }] } },
    } as unknown as OrganizationDashboardOutput);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="org-today-kpi-open-interventions"]'),
    ).toBeNull();
  });

  it('should hide the KPI row and the alert strip once the dashboard query fails', async () => {
    dashboardAlerts.set([{ code: 'expired_invitations', severity: 'medium', count: 4 }]);
    dashboardQueryHasError.set(true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="org-today-kpis"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="org-today-alerts"]')).toBeNull();
  });

  it('should render one localized sentence per dashboard alert code', async () => {
    dashboardAlerts.set([
      { code: 'critical_non_conformities_open', severity: 'high', count: 2 },
      { code: 'equipment_under_maintenance', severity: 'medium', count: 4 },
    ]);
    await fixture.whenStable();

    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('2 critical non-conformities still open');
    expect(text).toContain('4 equipment items under maintenance');
  });

  it('should link an alert row whose code names an evident destination, as an anchor', async () => {
    dashboardAlerts.set([{ code: 'expired_invitations', severity: 'medium', count: 4 }]);
    await fixture.whenStable();

    const row: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-today-alert-expired_invitations"]',
    );

    expect(row?.tagName).toBe('A');
    expect(row?.getAttribute('href')).toBe('/organizations/org-1/members');
  });

  it('should leave an unrecognized alert code as a plain, non-clickable row', async () => {
    dashboardAlerts.set([{ code: 'something_new', severity: 'medium', count: 1 }]);
    await fixture.whenStable();

    const row: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-today-alert-something_new"]',
    );

    expect(row?.tagName).toBe('DIV');
  });

  it('should show an icon, a label and a count badge for each named queue in the work-queues card', async () => {
    overdue.set({ key: 'overdue', total: 3, items: [] });
    await fixture.whenStable();

    const card: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-today-queues-card"]',
    );

    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Overdue');
    expect(card?.textContent).toContain('3');
    expect(card?.querySelector('[data-testid="org-today-queue-overdue"] ng-icon')).not.toBeNull();
  });

  it('should keep an empty queue visible with an all-clear row instead of hiding it', async () => {
    overdue.set({ key: 'overdue', total: 1, items: [intervention('i-1', null)] });
    await fixture.whenStable();

    const changesRequestedQueue: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-today-queue-changes-requested"]',
    );

    expect(changesRequestedQueue).not.toBeNull();
    expect(changesRequestedQueue?.textContent).toContain('All clear');
  });

  describe('see all navigation', () => {
    it('should open the list filtered to overdue when the overdue queue’s See all is clicked', async () => {
      const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        '[data-testid="org-today-queue-overdue"] button',
      );
      button?.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions'], {
        queryParams: { due: 'overdue' },
      });
    });

    it('should open the list filtered to changes requested when the sent-back queue’s See all is clicked', async () => {
      const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        '[data-testid="org-today-queue-changes-requested"] button',
      );
      button?.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions'], {
        queryParams: { status: 'changes_requested' },
      });
    });

    it('should open the list filtered to submitted when the awaiting-review queue’s See all is clicked', async () => {
      const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        '[data-testid="org-today-queue-awaiting-review"] button',
      );
      button?.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions'], {
        queryParams: { status: 'submitted' },
      });
    });

    it('should offer no See all navigation for the unsynced queue, which the list has no filter for', () => {
      const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        '[data-testid="org-today-queue-unsynced"] button',
      );

      expect(button).toBeNull();
    });
  });

  it('should render the recently updated interventions list with a status tag and a responsible avatar', async () => {
    dashboardRecentInterventions.set([recentIntervention()]);
    await fixture.whenStable();

    const row: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-today-recent-intervention"]',
    );

    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('Replace extinguisher');
    expect(row?.querySelector('app-intervention-tag')).not.toBeNull();
    expect(row?.textContent).toContain('JR');
  });

  it('should hide the recently updated interventions card from a member who cannot read interventions', async () => {
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    dashboardRecentInterventions.set([recentIntervention()]);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="org-today-recent-interventions"]'),
    ).toBeNull();
  });
});
