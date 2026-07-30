import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationDashboard } from '../organization-dashboard.component';

type OrganizationDashboardHarness = {
  readonly canReadDashboard: () => boolean;
  readonly canReadFacilities: () => boolean;
  readonly canReadMembers: () => boolean;
  readonly canReadEquipment: () => boolean;
  readonly canReadInspections: () => boolean;
  readonly canReadRecentInterventions: () => boolean;
  readonly hasActivityMetrics: () => boolean;
  readonly hasActivityInsights: () => boolean;
  readonly showActivitySection: () => boolean;
  readonly showResourcesSection: () => boolean;
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
  facilityCount: signal('12'),
  memberCount: signal('7'),
  equipmentCount: signal('28'),
  inspectionCount: signal('4'),
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  facilitiesComparison: signal(null),
  membersComparison: signal(null),
  equipmentComparison: signal(null),
  inspectionsComparison: signal(null),
  facilitiesSparkline: signal(null),
  membersSparkline: signal(null),
  equipmentSparkline: signal(null),
  inspectionsSparkline: signal(null),
  recentInterventions: signal<readonly OrganizationDashboardRecentIntervention[]>([
    RECENT_INTERVENTION,
  ]),
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
    vi.stubGlobal(
      'IntersectionObserver',
      class IntersectionObserver {
        observe(): void {}

        disconnect(): void {}

        unobserve(): void {}

        takeRecords(): never[] {
          return [];
        }
      },
    );

    grantedPermissions = new Set<string>();
    mockOrganizationPermissionService.hasPermission.mockClear();
    mockRouter.navigate.mockClear();
    mockDashboardStore.load.mockClear();
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
    }).overrideProvider(DashboardStore, { useValue: mockDashboardStore });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createComponent(): OrganizationDashboardHarness {
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as OrganizationDashboardHarness;
  }

  /**
   * Builds the component instance without triggering change detection, for
   * permission combinations (e.g. `DASHBOARD_READ`) that make
   * `hasActivityInsights()` true and would otherwise mount the real,
   * unstubbed trend cards behind the `@if` block. Reading a `computed`
   * signal does not require a render pass, so this still exercises the
   * gating logic under test without rendering the DOM.
   */
  function createComponentWithoutRender(): OrganizationDashboardHarness {
    const fixture = TestBed.createComponent(OrganizationDashboard);

    return fixture.componentInstance as unknown as OrganizationDashboardHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should hide both sections when no dashboard or resource permissions are granted', () => {
    const component = createComponent();

    expect(component.canReadDashboard()).toBe(false);
    expect(component.hasActivityMetrics()).toBe(false);
    expect(component.hasActivityInsights()).toBe(false);
    expect(component.showActivitySection()).toBe(false);
    expect(component.showResourcesSection()).toBe(false);
  });

  it('should render the no-access empty state when both sections are hidden', () => {
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-empty-state'))).toBeTruthy();
  });

  it('should render the metric strip and cells when only activity metrics are visible', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-metric-strip'))).toBeTruthy();
    const cells = fixture.debugElement.queryAll(By.css('app-dashboard-metric-cell'));
    expect(cells.length).toBe(1);
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

  it('should render the resource section skeleton placeholder before the deferred trend loads', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.FACILITIES_READ]);
    const fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('p-skeleton'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-asset-growth-trend'))).toBeFalsy();
  });

  it('should expose the dashboard sections when dashboard read access is granted', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponentWithoutRender();

    expect(component.canReadDashboard()).toBe(true);
    expect(component.canReadFacilities()).toBe(true);
    expect(component.canReadMembers()).toBe(true);
    expect(component.canReadEquipment()).toBe(true);
    expect(component.canReadInspections()).toBe(true);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(true);
  });

  it('should treat members-only access as an activity-only dashboard', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    const component = createComponent();

    expect(component.canReadMembers()).toBe(true);
    expect(component.hasActivityMetrics()).toBe(true);
    expect(component.hasActivityInsights()).toBe(false);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(false);
  });

  it('should gate recent interventions on the interventions read permission alone', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponentWithoutRender();

    expect(component.canReadRecentInterventions()).toBe(false);
  });

  it('should treat interventions-only access as an activity-only dashboard', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    expect(component.canReadRecentInterventions()).toBe(true);
    expect(component.hasActivityMetrics()).toBe(false);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(false);
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
