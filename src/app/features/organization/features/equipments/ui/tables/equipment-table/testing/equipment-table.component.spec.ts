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
    fixture.componentRef.setInput('sortOrder', { field: 'type', direction: 'asc' });
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

    const link: HTMLAnchorElement | null = root().querySelector(
      '[data-testid="equipment-table"] a',
    );

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

  it('should render one card per equipment alongside the table', async () => {
    await render([equipment(), equipment({ id: 'equipment-2', type: 'smoke_detector' })]);

    const cards: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="equipment-table-card"]',
    );

    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('SN-1');
  });

  it('should draw placeholder rows on a first load, and no data rows', async () => {
    await render([], true);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll('tbody tr');

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelectorAll('[data-testid="equipment-table-row"]').length).toBe(0);
    expect(
      [...rows].every((row: HTMLElement): boolean => row.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
  });

  it('should keep the rows on screen while a later page loads', async () => {
    await render([equipment()], true);

    expect(root().querySelectorAll('[data-testid="equipment-table-row"]').length).toBe(1);
    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('should say so plainly when there is nothing to show', async () => {
    await render([], false);

    expect(root().textContent).toContain('No results.');
  });

  it('should mark the active sort field with aria-sort and hide it from the rest', async () => {
    await render([equipment()]);
    fixture.componentRef.setInput('sortOrder', { field: 'status', direction: 'desc' });
    await fixture.whenStable();

    const heads: HTMLElement[] = [...root().querySelectorAll<HTMLElement>('th[aria-sort]')];
    const statusHead = heads.find((head) =>
      head.querySelector('[data-testid="equipment-table-sort-status"]'),
    );
    const typeHead = heads.find((head) =>
      head.querySelector('[data-testid="equipment-table-sort-type"]'),
    );

    expect(statusHead?.getAttribute('aria-sort')).toBe('descending');
    expect(typeHead?.getAttribute('aria-sort')).toBe('none');
  });

  it('should emit the field when a sortable head is activated', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.sortChanged.subscribe((field: string): void => {
      emitted.push(field);
    });

    await render([equipment()]);
    root().querySelector<HTMLButtonElement>('[data-testid="equipment-table-sort-brand"]')?.click();

    expect(emitted).toEqual(['brand']);
  });

  it('should name the scrolling region from the table caption', async () => {
    await render([equipment()]);

    const region: HTMLElement | null = root().querySelector('[role="region"]');
    const caption: HTMLElement | null = root().querySelector('caption');

    expect(region?.getAttribute('aria-labelledby')).toBe(caption?.id);
    expect(caption?.id).toBeTruthy();
  });
});
