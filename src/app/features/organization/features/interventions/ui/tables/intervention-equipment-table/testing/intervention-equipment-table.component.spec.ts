import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { InterventionEquipmentTable } from '../intervention-equipment-table.component';

const equipment = (overrides: Partial<EquipmentOutput> = {}): EquipmentOutput =>
  ({
    id: 'eq-1',
    organizationId: 'org-1',
    facilityId: 'facility-1',
    type: 'fire_extinguisher',
    subType: null,
    brand: 'Sicli',
    model: 'CO2-6',
    serialNumber: 'SN-001',
    locationLabel: 'Hall A',
    status: 'operational',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as EquipmentOutput;

describe('InterventionEquipmentTable', () => {
  let fixture: ComponentFixture<InterventionEquipmentTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionEquipmentTable);
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();
  });

  it('should render each linked equipment by type, brand/model and status', async () => {
    fixture.componentRef.setInput('items', [
      equipment({
        type: 'fire_extinguisher',
        brand: 'Sicli',
        model: 'CO2-6',
        status: 'operational',
      }),
    ]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-equipment-row') as HTMLElement;

    expect(row.textContent).toContain('fire extinguisher');
    expect(row.textContent).toContain('Sicli CO2-6');
    expect(row.textContent).toContain('Operational');
    expect(row.textContent).toContain('Hall A');
  });

  it('should show a loading indicator while the tab fetch is in flight and nothing has loaded yet', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    const status: HTMLElement | null = byTestId('intervention-equipment-loading');

    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
  });

  it('should not show the loading indicator once equipment is already on screen', async () => {
    fixture.componentRef.setInput('items', [equipment()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(byTestId('intervention-equipment-loading')).toBeNull();
  });

  it('should surface a fetch error as an alert', async () => {
    fixture.componentRef.setInput('error', 'Linked equipment could not be loaded.');
    await fixture.whenStable();

    const alert: HTMLElement | null = byTestId('intervention-equipment-error');

    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Linked equipment could not be loaded.');
  });

  it('should show the empty state when nothing is linked', () => {
    expect(byTestId('intervention-equipment-empty')?.textContent).toContain(
      'No equipment is linked to this intervention yet.',
    );
  });
});
