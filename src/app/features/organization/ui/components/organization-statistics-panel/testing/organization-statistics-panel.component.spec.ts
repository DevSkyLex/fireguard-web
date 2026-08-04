import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationStatisticsPanel } from '../organization-statistics-panel.component';

type OrganizationStatisticsHarness = {
  readonly canReadDashboard: () => boolean;
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
  queryHasError: signal(false),
  facilitiesComparison: signal(null),
  membersComparison: signal(null),
  equipmentComparison: signal(null),
  inspectionsComparison: signal(null),
  facilitiesSparkline: signal(null),
  membersSparkline: signal(null),
  equipmentSparkline: signal(null),
  inspectionsSparkline: signal(null),
};

describe('OrganizationStatisticsPanel', () => {
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
    mockDashboardStore.isQueryLoading.set(false);
    mockDashboardStore.queryHasError.set(false);

    /**
     * `DashboardStore` is provided at the `OrganizationStatisticsPanel` component
     * level (`providers: [DashboardStore]`), so it is swapped with
     * `overrideProvider` rather than `overrideComponent` — recompiling the
     * target component through `overrideComponent` breaks V8 coverage
     * source-map attribution for its own external template. Every child
     * import stays the real component.
     */
    TestBed.configureTestingModule({
      imports: [OrganizationStatisticsPanel],
      providers: [
        { provide: OrganizationPermissionService, useValue: mockOrganizationPermissionService },
      ],
    }).overrideProvider(DashboardStore, { useValue: mockDashboardStore });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createComponent(): OrganizationStatisticsHarness {
    const fixture = TestBed.createComponent(OrganizationStatisticsPanel);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as OrganizationStatisticsHarness;
  }

  /**
   * Builds the component instance without triggering change detection, for
   * permission combinations (e.g. `DASHBOARD_READ`) that make
   * `hasActivityInsights()` true and would otherwise mount the real,
   * unstubbed trend cards behind the `@if` block. Reading a `computed`
   * signal does not require a render pass, so this still exercises the
   * gating logic under test without rendering the DOM.
   */
  function createComponentWithoutRender(): OrganizationStatisticsHarness {
    const fixture = TestBed.createComponent(OrganizationStatisticsPanel);

    return fixture.componentInstance as unknown as OrganizationStatisticsHarness;
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
    const fixture = TestBed.createComponent(OrganizationStatisticsPanel);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-empty-state'))).toBeTruthy();
  });

  it('should render the metric strip and cells when only activity metrics are visible', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    const fixture = TestBed.createComponent(OrganizationStatisticsPanel);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-metric-strip'))).toBeTruthy();
    const cells = fixture.debugElement.queryAll(By.css('app-dashboard-metric-cell'));
    expect(cells.length).toBe(1);
  });

  it('should render the resource section skeleton placeholder before the deferred trend loads', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.FACILITIES_READ]);
    const fixture = TestBed.createComponent(OrganizationStatisticsPanel);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('p-skeleton'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-asset-growth-trend'))).toBeFalsy();
  });

  it('should expose the activity and resource sections when dashboard read access is granted', () => {
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
});
