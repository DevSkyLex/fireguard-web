import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EquipmentMaintenanceLogOutput } from '@features/organization/features/equipments/models';
import { EquipmentMaintenanceHistory } from '../equipment-maintenance-history.component';

const log = (
  id: string,
  overrides: Partial<EquipmentMaintenanceLogOutput> = {},
): EquipmentMaintenanceLogOutput =>
  ({
    '@id': `/api/equipment-maintenance-logs/${id}`,
    '@type': 'EquipmentMaintenanceLog',
    id,
    equipmentId: 'equipment-1',
    organizationId: 'org-1',
    startedAt: '2026-01-01T00:00:00Z',
    source: 'status_transition',
    ...overrides,
  }) as EquipmentMaintenanceLogOutput;

describe('EquipmentMaintenanceHistory', () => {
  let fixture: ComponentFixture<EquipmentMaintenanceHistory>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (logs: readonly EquipmentMaintenanceLogOutput[]): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(EquipmentMaintenanceHistory);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('logs', logs);
    await fixture.whenStable();
  };

  it('should show the empty state when there is no history', async () => {
    await create([]);

    expect(
      root().querySelector('[data-testid="equipment-maintenance-history-empty"]'),
    ).not.toBeNull();
  });

  it('should render newest first', async () => {
    await create([
      log('older', { startedAt: '2026-01-01T00:00:00Z' }),
      log('newer', { startedAt: '2026-02-01T00:00:00Z' }),
    ]);

    const rows = root().querySelectorAll('[data-testid="equipment-maintenance-log-row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Status change');
  });

  it('should show the intervention link with the FG number when interventionId is present', async () => {
    await create([
      log('with-intervention', {
        source: 'intervention',
        interventionId: 'intervention-1',
        interventionNumber: 42,
      }),
    ]);

    const link: HTMLAnchorElement | null = root().querySelector(
      '[data-testid="equipment-maintenance-log-intervention-link"]',
    );
    expect(link?.textContent?.trim()).toBe('FG-42');
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/interventions/intervention-1');
  });

  it('should not show an intervention link when interventionId is absent', async () => {
    await create([log('no-intervention')]);

    expect(
      root().querySelector('[data-testid="equipment-maintenance-log-intervention-link"]'),
    ).toBeNull();
  });

  it('should show the recorded summary when present', async () => {
    await create([log('with-summary', { summary: 'Replaced the pressure gauge.' })]);

    expect(root().textContent).toContain('Replaced the pressure gauge.');
  });
});
