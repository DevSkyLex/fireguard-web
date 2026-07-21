import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentTable } from '../equipment-table.component';

const equipment = (overrides: Partial<EquipmentOutput> = {}): EquipmentOutput =>
  ({
    '@id': '/api/organizations/org-1/equipment/eq-1',
    '@type': 'Equipment',
    id: 'eq-1',
    organizationId: 'org-1',
    facilityId: 'fac-1',
    type: 'extinguisher',
    subType: null,
    brand: 'Acme',
    model: 'A-100',
    serialNumber: 'SN-001',
    locationLabel: 'Boiler room',
    facilityName: 'Northgate Plant',
    status: 'operational',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-03',
    maintenanceDueStatus: 'up_to_date',
    ...overrides,
  }) as EquipmentOutput;

const createComponent = (rows: readonly EquipmentOutput[]): ComponentFixture<EquipmentTable> => {
  TestBed.configureTestingModule({
    imports: [EquipmentTable],
    providers: [
      { provide: OrganizationPermissionService, useValue: { hasPermission: vi.fn(() => true) } },
    ],
  });

  const fixture = TestBed.createComponent(EquipmentTable);
  fixture.componentRef.setInput('equipments', rows);
  fixture.componentRef.setInput('total', rows.length);
  fixture.componentRef.setInput('loading', false);
  fixture.componentRef.setInput('empty', rows.length === 0);
  fixture.detectChanges();
  return fixture;
};

const facilityCell = (fixture: ComponentFixture<EquipmentTable>): HTMLElement | null =>
  fixture.nativeElement.querySelector('[data-testid="equipment-facility-name"]');

describe('EquipmentTable', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  // The record stores only `facilityId`; the name is resolved server-side, and
  // before it existed a free-text "Boiler room" had no site to belong to.
  it('should show the facility a piece of equipment belongs to', () => {
    const fixture = createComponent([equipment()]);

    expect(facilityCell(fixture)?.textContent).toContain('Northgate Plant');
    expect(fixture.nativeElement.textContent).toContain('Boiler room');
  });

  // An unassigned item, or an older payload: the spot inside the site is all
  // there is, and it must still render.
  it('should fall back to the location label alone when no facility is resolved', () => {
    const fixture = createComponent([equipment({ facilityName: null })]);

    expect(facilityCell(fixture)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Boiler room');
  });

  it('should show a dash when neither is known', () => {
    const fixture = createComponent([equipment({ facilityName: null, locationLabel: null })]);

    expect(facilityCell(fixture)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('-');
  });

  // A resolved facility with no in-site label is the common case for equipment
  // recorded against a whole building.
  it('should show the facility alone when there is no in-site label', () => {
    const fixture = createComponent([equipment({ locationLabel: null })]);

    expect(facilityCell(fixture)?.textContent).toContain('Northgate Plant');
    expect(fixture.nativeElement.textContent).not.toContain('Boiler room');
  });
});
