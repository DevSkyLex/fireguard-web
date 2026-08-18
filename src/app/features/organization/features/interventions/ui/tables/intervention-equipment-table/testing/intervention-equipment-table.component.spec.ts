import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InterventionEquipmentTable);
    fixture.componentRef.setInput('organizationId', 'org-1');
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

    const row: HTMLElement = byTestId('intervention-equipment-table-row') as HTMLElement;

    expect(row.textContent).toContain('fire extinguisher');
    expect(row.textContent).toContain('Sicli CO2-6');
    expect(row.textContent).toContain('Operational');
    expect(row.textContent).toContain('Hall A');
  });

  it('should link a published equipment row to its detail route', async () => {
    fixture.componentRef.setInput('items', [equipment({ id: 'eq-1', recordStatus: 'published' })]);
    await fixture.whenStable();

    const link: HTMLAnchorElement | null = byTestId(
      'intervention-equipment-table-row',
    )?.querySelector('a') as HTMLAnchorElement | null;

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/equipments/eq-1');
  });

  it('should render a draft-record row as plain text, not a link', async () => {
    fixture.componentRef.setInput('items', [equipment({ id: 'eq-1', recordStatus: 'draft' })]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-equipment-table-row') as HTMLElement;

    expect(row.querySelector('a')).toBeNull();
  });

  it('should draw skeleton rows while the tab fetch is in flight and nothing has loaded yet', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll('tbody tr');
    const status: HTMLElement | null = root().querySelector('[role="status"]');

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(
      [...rows].every((row: HTMLElement): boolean => row.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
    expect(status).not.toBeNull();
  });

  it('should not show the skeleton rows once equipment is already on screen', async () => {
    fixture.componentRef.setInput('items', [equipment()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
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

  it('should show the "Show more" button when the server holds more equipment than is loaded', async () => {
    fixture.componentRef.setInput('items', [equipment()]);
    fixture.componentRef.setInput('totalItems', 2);
    await fixture.whenStable();

    expect(byTestId('intervention-equipment-load-more')).not.toBeNull();
  });

  it('should hide the "Show more" button once every equipment is loaded', async () => {
    fixture.componentRef.setInput('items', [equipment()]);
    fixture.componentRef.setInput('totalItems', 1);
    await fixture.whenStable();

    expect(byTestId('intervention-equipment-load-more')).toBeNull();
  });

  it('should emit loadMoreRequested when the "Show more" button is pressed', async () => {
    fixture.componentRef.setInput('items', [equipment()]);
    fixture.componentRef.setInput('totalItems', 2);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.loadMoreRequested.subscribe(requested);
    byTestId('intervention-equipment-load-more')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('should disable the "Show more" button and show the spinner label while loading more', async () => {
    fixture.componentRef.setInput('items', [equipment()]);
    fixture.componentRef.setInput('totalItems', 2);
    fixture.componentRef.setInput('loadingMore', true);
    await fixture.whenStable();

    const button = byTestId('intervention-equipment-load-more') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Loading…');
  });
});
