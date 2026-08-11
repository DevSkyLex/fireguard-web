import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentTable } from '../equipment-table.component';

const equipment = (overrides: Partial<EquipmentOutput> = {}): EquipmentOutput =>
  ({
    '@id': '/api/organizations/org-1/equipment/equipment-1',
    '@type': 'Equipment',
    id: 'equipment-1',
    organizationId: 'org-1',
    facilityId: null,
    facilityName: null,
    type: 'fire_extinguisher',
    subType: null,
    brand: 'Kidde',
    model: 'Pro 210',
    serialNumber: 'SN-1',
    locationLabel: null,
    status: 'operational',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    maintenanceDueStatus: 'up_to_date',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as EquipmentOutput;

describe('EquipmentTable', () => {
  let fixture: ComponentFixture<EquipmentTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (items: readonly EquipmentOutput[], loading = false): Promise<void> => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'equipments']);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(EquipmentTable);
  });

  it('should render one row per equipment, humanizing the raw type', async () => {
    await render([equipment(), equipment({ id: 'equipment-2', type: 'smoke_detector' })]);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="equipment-table-row"]',
    );

    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Fire extinguisher');
    expect(rows[1].textContent).toContain('Smoke detector');
  });

  it('should link the type cell to the equipment record', async () => {
    await render([equipment()]);

    const link: HTMLAnchorElement | null = root().querySelector('a');

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/equipments/equipment-1');
  });

  it('should show the facility name over the raw location, with the location as a secondary line', async () => {
    await render([equipment({ facilityName: 'Warehouse B', locationLabel: 'Aisle 4' })]);

    const row: HTMLElement | null = root().querySelector('[data-testid="equipment-table-row"]');

    expect(row?.textContent).toContain('Warehouse B');
    expect(row?.textContent).toContain('Aisle 4');
  });

  it('should mark an equipment with neither a facility nor a location as unassigned', async () => {
    await render([equipment({ facilityName: null, locationLabel: null })]);

    expect(root().textContent).toContain('Unassigned');
  });

  it('should draw skeleton rows while loading with nothing loaded yet', async () => {
    await render([], true);

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelectorAll('[data-testid="equipment-table-row"]').length).toBe(0);
  });
});
