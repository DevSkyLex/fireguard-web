import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { OrganizationPermissionService } from '@features/organization/access';
import { ParkService } from '@features/organization/data-access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { OrganizationParkQueues } from '../organization-park-queues.component';

const setup = (
  platform = 'browser',
  grants: readonly string[] = [
    ORGANIZATION_PERMISSION.EQUIPMENT_READ,
    ORGANIZATION_PERMISSION.INSPECTION_READ,
    ORGANIZATION_PERMISSION.FACILITIES_READ,
  ],
) => {
  const permissions = signal(grants);
  const equipment = {
    summary: vi.fn().mockReturnValue(of({ byStatus: { under_maintenance: 2 } })),
    summaryByFacility: vi.fn().mockReturnValue(of({ byStatus: { under_maintenance: 2 } })),
    list: vi.fn().mockReturnValue(of({ totalItems: 5, member: [] })),
    listByFacility: vi.fn().mockReturnValue(of({ totalItems: 5, member: [] })),
  };
  const park = {
    anomaliesSummary: vi.fn().mockReturnValue(of({ openAnomalies: 4, bySeverity: {} })),
  };
  const facilities = {
    list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
    get: vi.fn().mockReturnValue(of({ id: 'site', name: 'North campus', type: 'site', path: [] })),
  };
  TestBed.configureTestingModule({
    imports: [OrganizationParkQueues],
    providers: [
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: platform },
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(false), interactionMode: () => 'desktop' },
      },
      {
        provide: OrganizationPermissionService,
        useValue: { hasPermission: (permission: string) => permissions().includes(permission) },
      },
      { provide: EquipmentService, useValue: equipment },
      { provide: ParkService, useValue: park },
      { provide: FacilityService, useValue: facilities },
      {
        provide: CustomerService,
        useValue: {
          list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
          get: vi.fn(),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(OrganizationParkQueues);
  fixture.componentRef.setInput('organizationId', 'org');
  return { fixture, equipment, park, facilities, permissions };
};

describe('OrganizationParkQueues', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  it('loads three exact counts and routes each action with the same client, site and family', async () => {
    const { fixture, equipment } = setup();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-stat-tile')).toHaveLength(3);
    fixture.componentInstance['customerChanged']('customer');
    fixture.componentInstance['facilityId'].set('site');
    fixture.componentInstance['familyChanged']('all');
    await fixture.whenStable();
    expect(equipment.summaryByFacility).toHaveBeenLastCalledWith('org', 'site', true, {
      params: { customerId: 'customer' },
    });
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('app-stat-tile a') as NodeListOf<HTMLAnchorElement>,
    );
    const controls = links.find((link) => link.textContent?.includes('Controls to prepare'));
    expect(controls).toBeDefined();
    const url = new URL(controls?.href ?? '', 'https://app.test');
    expect(url.searchParams.get('family')).toBe('all');
    expect(url.searchParams.get('customerId')).toBe('customer');
    expect(url.searchParams.get('facility')).toBe('site');
    expect(url.searchParams.get('queue')).toBe('controls');
  });
  it('does not read queue or site data during SSR', async () => {
    const { fixture, equipment, park, facilities } = setup('server');
    await fixture.whenStable();
    expect(equipment.summary).not.toHaveBeenCalled();
    expect(park.anomaliesSummary).not.toHaveBeenCalled();
    expect(facilities.list).not.toHaveBeenCalled();
  });
  it('requires both inspection and equipment reads for the anomaly queue', async () => {
    const { fixture, equipment, park } = setup('browser', [
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    await fixture.whenStable();
    expect(equipment.summary).not.toHaveBeenCalled();
    expect(park.anomaliesSummary).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('app-stat-tile')).toHaveLength(0);
  });

  it('renders authorized counts without dead-route links for an equipment and dashboard reader', async () => {
    const { fixture, equipment, facilities } = setup('browser', [
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
    ]);
    await fixture.whenStable();
    expect(equipment.summary).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('app-stat-tile')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('app-stat-tile a')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Unavailable equipment');
    expect(fixture.nativeElement.textContent).toContain('Controls to prepare');
    expect(fixture.componentInstance['unavailable']()).toBe(2);
    expect(fixture.componentInstance['controls']()).toBe(5);
    expect(facilities.list).not.toHaveBeenCalled();
    expect(facilities.get).not.toHaveBeenCalled();
  });

  it('removes every park link and selected-site read after the site grant is revoked', async () => {
    const { fixture, permissions } = setup();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-stat-tile a')).toHaveLength(3);
    fixture.componentInstance['facilityId'].set('site');
    await fixture.whenStable();
    const siteReads = fixture.componentInstance['store'].siteCallState();
    expect(siteReads.status).toBe('success');
    permissions.set([
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
    ]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-stat-tile')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('app-stat-tile a')).toHaveLength(0);
    expect(fixture.componentInstance['store'].siteCallState().status).toBe('idle');
    expect(fixture.componentInstance['controls']()).toBe(5);
  });
});
