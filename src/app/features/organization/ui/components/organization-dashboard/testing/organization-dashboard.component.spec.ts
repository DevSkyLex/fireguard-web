import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardAlert,
  type OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import { OrganizationAttentionStore } from '@features/organization/state/organization-attention';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationDashboard } from '../organization-dashboard.component';

type OrganizationDashboardHarness = {
  readonly canReadDashboard: () => boolean;
  readonly canReadRecentInterventions: () => boolean;
  openIntervention(intervention: OrganizationDashboardRecentIntervention): void;
  retryDashboard(): void;
};

const RECENT_INTERVENTION: OrganizationDashboardRecentIntervention = {
  id: 'int-1',
  number: 2048,
  name: 'Contrôle annuel extincteurs',
  status: 'in_progress',
  priority: 'high',
  siteId: 'fac-1',
  siteName: 'Siège — Paris 12e',
  responsibleId: 'member-1',
  responsibleName: 'Claire Lefèvre',
  responsibleAvatarUrl: null,
  dueAt: '2026-07-18T00:00:00+00:00',
  updatedAt: '2026-07-15T09:30:00+00:00',
};

const mockDashboardStore = {
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  recentInterventions: signal<readonly OrganizationDashboardRecentIntervention[]>([
    RECENT_INTERVENTION,
  ]),
  alerts: signal<readonly OrganizationDashboardAlert[]>([]),
  loadParams: signal<string | undefined>('org-1'),
  load: vi.fn(),
};

const mockAttentionStore = {
  awaitingReviewCount: signal(0),
  changesRequestedCount: signal(0),
  overdueCount: signal(0),
  hasAttention: signal(false),
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  loadParams: signal<string | undefined>('org-1'),
  load: vi.fn(),
};

describe('OrganizationDashboard', () => {
  let grantedPermissions: Set<string>;
  const mockOrganizationPermissionService = {
    hasPermission: vi.fn((permission: string) => grantedPermissions.has(permission)),
  };
  const mockRouter = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    grantedPermissions = new Set<string>();
    mockOrganizationPermissionService.hasPermission.mockClear();
    mockRouter.navigate.mockClear();
    mockDashboardStore.load.mockClear();
    mockAttentionStore.load.mockClear();
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.queryHasError.set(false);
    mockDashboardStore.recentInterventions.set([RECENT_INTERVENTION]);

    /**
     * `DashboardStore` is provided at the `OrganizationDashboard` component
     * level (`providers: [DashboardStore]`), so it is swapped with
     * `overrideProvider` rather than `overrideComponent` — recompiling the
     * target component through `overrideComponent` breaks V8 coverage
     * source-map attribution for its own external template. Every child
     * import stays the real component.
     */
    TestBed.configureTestingModule({
      imports: [OrganizationDashboard],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationPermissionService, useValue: mockOrganizationPermissionService },
      ],
    })
      .overrideProvider(DashboardStore, { useValue: mockDashboardStore })
      .overrideProvider(OrganizationAttentionStore, { useValue: mockAttentionStore });
  });

  function createComponent(): OrganizationDashboardHarness {
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as OrganizationDashboardHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should hide the attention panel and recent-interventions table when no permission is granted', () => {
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as OrganizationDashboardHarness;

    expect(component.canReadDashboard()).toBe(false);
    expect(component.canReadRecentInterventions()).toBe(false);
    expect(fixture.debugElement.query(By.css('app-dashboard-attention-panel'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('app-dashboard-recent-interventions'))).toBeFalsy();
  });

  it('should render the attention panel when dashboard read access is granted', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-attention-panel'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-dashboard-recent-interventions'))).toBeFalsy();
  });

  it('should render the recent-interventions table and forward its outputs', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.css('app-dashboard-recent-interventions'));
    expect(table).toBeTruthy();

    table.triggerEventHandler('open', RECENT_INTERVENTION);
    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'int-1',
    ]);

    table.triggerEventHandler('retry', undefined);
    expect(mockDashboardStore.load).toHaveBeenCalledWith('org-1');
  });

  it('should gate recent interventions on the interventions read permission alone', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadRecentInterventions()).toBe(false);
  });

  it('should route into the intervention workspace when a row is opened', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    component.openIntervention({ id: 'int-9' } as OrganizationDashboardRecentIntervention);

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'int-9',
    ]);
  });

  it('should not navigate when opening an intervention without an active organization', () => {
    mockDashboardStore.loadParams.set(undefined);
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    component.openIntervention({ id: 'int-9' } as OrganizationDashboardRecentIntervention);

    expect(mockRouter.navigate).not.toHaveBeenCalled();

    mockDashboardStore.loadParams.set('org-1');
  });

  it('should re-trigger the dashboard query on retry', () => {
    const component = createComponent();

    component.retryDashboard();

    expect(mockDashboardStore.load).toHaveBeenCalledWith('org-1');
  });
});
