import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
  recentInterventions: signal<readonly OrganizationDashboardRecentIntervention[]>([]),
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

    TestBed.configureTestingModule({
      imports: [OrganizationDashboard],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).overrideComponent(OrganizationDashboard, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: DashboardStore, useValue: mockDashboardStore },
          {
            provide: OrganizationPermissionService,
            useValue: mockOrganizationPermissionService,
          },
        ],
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('should hide both sections when no dashboard or resource permissions are granted', () => {
    const component = createComponent();

    expect(component.canReadDashboard()).toBe(false);
    expect(component.hasActivityMetrics()).toBe(false);
    expect(component.hasActivityInsights()).toBe(false);
    expect(component.showActivitySection()).toBe(false);
    expect(component.showResourcesSection()).toBe(false);
  });

  it('should expose the dashboard sections when dashboard read access is granted', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadDashboard()).toBe(true);
    expect(component.canReadFacilities()).toBe(true);
    expect(component.canReadMembers()).toBe(true);
    expect(component.canReadEquipment()).toBe(true);
    expect(component.canReadInspections()).toBe(true);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(true);
  });

  it('should expose both sections when inspections and resources are readable', () => {
    grantedPermissions = new Set<string>([
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    const component = createComponent();

    expect(component.canReadFacilities()).toBe(true);
    expect(component.canReadEquipment()).toBe(true);
    expect(component.canReadInspections()).toBe(true);
    expect(component.hasActivityMetrics()).toBe(true);
    expect(component.hasActivityInsights()).toBe(true);
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
    const component = createComponent();

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

  it('should re-trigger the dashboard query on retry', () => {
    const component = createComponent();

    component.retryDashboard();

    expect(mockDashboardStore.load).toHaveBeenCalledWith('org-1');
  });
});
