import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationDashboard } from '../organization-dashboard.component';

type OrganizationDashboardHarness = {
  readonly canReadFacilities: () => boolean;
  readonly canReadMembers: () => boolean;
  readonly canReadEquipment: () => boolean;
  readonly canReadInspections: () => boolean;
  readonly hasActivityMetrics: () => boolean;
  readonly hasActivityInsights: () => boolean;
  readonly showActivitySection: () => boolean;
  readonly showResourcesSection: () => boolean;
};

const mockDashboardStore = {
  facilityCount: signal('12'),
  memberCount: signal('7'),
  equipmentCount: signal('28'),
  inspectionCount: signal('4'),
  isQueryLoading: signal(false),
  facilitiesComparison: signal(null),
  membersComparison: signal(null),
  equipmentComparison: signal(null),
  inspectionsComparison: signal(null),
};

describe('OrganizationDashboard', () => {
  let grantedPermissions: Set<string>;
  const mockOrganizationPermissionService = {
    hasPermission: vi.fn((permission: string) => grantedPermissions.has(permission)),
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

    TestBed.configureTestingModule({
      imports: [OrganizationDashboard],
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

  it('should hide both sections when no dashboard permissions are granted', () => {
    const component = createComponent();

    expect(component.hasActivityMetrics()).toBe(false);
    expect(component.hasActivityInsights()).toBe(false);
    expect(component.showActivitySection()).toBe(false);
    expect(component.showResourcesSection()).toBe(false);
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
});
