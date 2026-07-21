import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ACCOUNT_PERMISSION, UserPermissionService } from '@features/account';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import type { ComplianceFacilityRow } from '@features/organization/features/compliance/models';
import { ComplianceSummaryStore } from '@features/organization/features/compliance/state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  DashboardStore,
  RecentActivityStore,
  UpcomingInterventionsStore,
} from '@features/organization/state/organization-dashboard';
import { OrganizationDashboard } from '../organization-dashboard.component';

type OrganizationDashboardHarness = {
  readonly canReadDashboard: () => boolean;
  readonly canReadEquipment: () => boolean;
  readonly canReadInspections: () => boolean;
  readonly canReadInterventions: () => boolean;
  readonly canReadCompliance: () => boolean;
  readonly canReadAudit: () => boolean;
  readonly hasMetricCells: () => boolean;
  readonly hasChartCards: () => boolean;
  readonly showDashboard: () => boolean;
  readonly complianceRateValue: () => string | null;
  readonly openNonConformityCount: () => number;
  readonly criticalNonConformitiesNote: () => string;
  readonly equipmentDueSoonCount: () => number;
  openIntervention(intervention: InterventionOutput): void;
  openInterventionList(): void;
  retryUpcoming(): void;
  retryActivity(): void;
  openCompliance(): void;
  retryCompliance(): void;
};

const mockDashboardStore = {
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  openInterventionCount: signal<number | null>(4),
  overdueInterventionCount: signal<number | null>(2),
  nonConformitiesBySeverity: signal([
    { severity: 'critical', count: 2 },
    { severity: 'high', count: 3 },
    { severity: 'medium', count: 1 },
    { severity: 'low', count: 0 },
  ]),
  equipmentByStatus: signal([]),
  inspectionsByResult: signal([]),
  loadParams: signal<string | undefined>('org-1'),
  load: vi.fn(),
};

const mockComplianceSummaryStore = {
  facilities: signal<readonly ComplianceFacilityRow[]>([]),
  rollup: signal({
    totalEquipmentCount: 20,
    trackedEquipmentCount: 18,
    upToDateEquipmentCount: 12,
    dueSoonEquipmentCount: 5,
    overdueEquipmentCount: 1,
    unscheduledEquipmentCount: 2,
    complianceRate: 66.6,
    openCriticalNonConformityCount: 2,
    openHighNonConformityCount: 3,
    openMediumNonConformityCount: 1,
    openLowNonConformityCount: 0,
  }),
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  load: vi.fn(),
};

const mockUpcomingStore = {
  queryData: signal<readonly InterventionOutput[] | null>([]),
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  load: vi.fn(),
};

const mockActivityStore = {
  queryData: signal(null),
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  load: vi.fn(),
};

describe('OrganizationDashboard', () => {
  let grantedOrganizationPermissions: Set<string>;
  let grantedAccountPermissions: Set<string>;
  let fixture: ComponentFixture<OrganizationDashboard>;
  const mockOrganizationPermissionService = {
    hasPermission: vi.fn((permission: string) => grantedOrganizationPermissions.has(permission)),
  };
  const mockUserPermissionService = {
    hasPermission: vi.fn((permission: string) => grantedAccountPermissions.has(permission)),
  };
  const mockRouter = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    grantedOrganizationPermissions = new Set<string>();
    grantedAccountPermissions = new Set<string>();
    mockOrganizationPermissionService.hasPermission.mockClear();
    mockUserPermissionService.hasPermission.mockClear();
    mockRouter.navigate.mockClear();
    mockDashboardStore.load.mockClear();
    mockComplianceSummaryStore.load.mockClear();
    mockUpcomingStore.load.mockClear();
    mockActivityStore.load.mockClear();

    TestBed.configureTestingModule({
      imports: [OrganizationDashboard],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: UserPermissionService, useValue: mockUserPermissionService },
      ],
    }).overrideComponent(OrganizationDashboard, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: DashboardStore, useValue: mockDashboardStore },
          { provide: ComplianceSummaryStore, useValue: mockComplianceSummaryStore },
          { provide: UpcomingInterventionsStore, useValue: mockUpcomingStore },
          { provide: RecentActivityStore, useValue: mockActivityStore },
          {
            provide: OrganizationPermissionService,
            useValue: mockOrganizationPermissionService,
          },
        ],
      },
    });
  });

  function createComponent(): OrganizationDashboardHarness {
    fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as OrganizationDashboardHarness;
  }

  function upcomingLoadParams(): (() => string | null) | undefined {
    return mockUpcomingStore.load.mock.calls[0]?.[0] as (() => string | null) | undefined;
  }

  function activityLoadGate(): (() => boolean) | undefined {
    return mockActivityStore.load.mock.calls[0]?.[0] as (() => boolean) | undefined;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should hide every module when no permission is granted', () => {
    const component = createComponent();

    expect(component.canReadDashboard()).toBe(false);
    expect(component.hasMetricCells()).toBe(false);
    expect(component.hasChartCards()).toBe(false);
    expect(component.showDashboard()).toBe(false);
  });

  it('should expose the chart cards when dashboard read access is granted', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadDashboard()).toBe(true);
    expect(component.canReadEquipment()).toBe(true);
    expect(component.canReadInspections()).toBe(true);
    expect(component.hasChartCards()).toBe(true);
    expect(component.showDashboard()).toBe(true);
  });

  it('should gate the interventions surfaces on the interventions permission alone', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadInterventions()).toBe(false);
    expect(upcomingLoadParams()?.()).toBeNull();
  });

  it('should load upcoming interventions on the interventions permission', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    expect(component.canReadInterventions()).toBe(true);
    expect(component.hasMetricCells()).toBe(true);
    expect(component.showDashboard()).toBe(true);
    expect(upcomingLoadParams()?.()).toBe('org-1');
  });

  it('should gate the activity feed on the global audit permission', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadAudit()).toBe(false);
    expect(activityLoadGate()?.()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-dashboard-recent-activity')).toBeNull();
  });

  it('should render the activity feed on the audit permission alone', () => {
    grantedAccountPermissions = new Set<string>([ACCOUNT_PERMISSION.AUDIT_READ]);
    const component = createComponent();

    expect(component.canReadAudit()).toBe(true);
    expect(component.showDashboard()).toBe(true);
    expect(activityLoadGate()?.()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-dashboard-recent-activity')).toBeTruthy();
  });

  it('should derive the compliance metric cells from the rollup', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.COMPLIANCE_READ]);
    const component = createComponent();

    expect(component.canReadCompliance()).toBe(true);
    expect(component.complianceRateValue()).toBe('67%');
    expect(component.equipmentDueSoonCount()).toBe(5);
  });

  it('should sum open non-conformities and surface the critical bucket', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.openNonConformityCount()).toBe(6);
    expect(component.criticalNonConformitiesNote()).toContain('2');
  });

  it('should route into the intervention workspace when a row is opened', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    component.openIntervention({ id: 'int-9' } as InterventionOutput);

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'int-9',
    ]);
  });

  it('should route into the full intervention list from the upcoming card', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    component.openInterventionList();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions']);
  });

  it('should re-trigger the upcoming interventions query on retry', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    component.retryUpcoming();

    expect(mockUpcomingStore.load).toHaveBeenLastCalledWith('org-1');
  });

  it('should re-trigger the activity query on retry', () => {
    grantedAccountPermissions = new Set<string>([ACCOUNT_PERMISSION.AUDIT_READ]);
    const component = createComponent();

    component.retryActivity();

    expect(mockActivityStore.load).toHaveBeenLastCalledWith(true);
  });

  it('should not render the compliance card without the compliance read permission', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadCompliance()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-compliance-by-site')).toBeNull();
  });

  it('should route into the compliance register from the card', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.COMPLIANCE_READ]);
    const component = createComponent();

    component.openCompliance();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'compliance']);
  });

  it('should re-trigger the compliance query on retry', () => {
    grantedOrganizationPermissions = new Set<string>([ORGANIZATION_PERMISSION.COMPLIANCE_READ]);
    const component = createComponent();

    component.retryCompliance();

    expect(mockComplianceSummaryStore.load).toHaveBeenLastCalledWith('org-1');
  });
});
