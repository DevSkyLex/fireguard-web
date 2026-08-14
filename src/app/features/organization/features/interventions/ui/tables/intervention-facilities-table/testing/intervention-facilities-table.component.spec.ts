import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { InterventionFacilitiesTable } from '../intervention-facilities-table.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'Main warehouse',
    code: 'WH-1',
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as FacilityOutput;

describe('InterventionFacilitiesTable', () => {
  let fixture: ComponentFixture<InterventionFacilitiesTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionFacilitiesTable);
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();
  });

  it('should render each linked facility by name, type and status', async () => {
    fixture.componentRef.setInput('items', [
      facility({ id: 'facility-1', name: 'Main warehouse', type: 'building', status: 'active' }),
    ]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-facilities-table-row') as HTMLElement;

    expect(row.textContent).toContain('Main warehouse');
    expect(row.textContent).toContain('Building');
    expect(row.textContent).toContain('Active');
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

  it('should not show the skeleton rows once facilities are already on screen', async () => {
    fixture.componentRef.setInput('items', [facility()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('should surface a fetch error as an alert', async () => {
    fixture.componentRef.setInput('error', 'Linked facilities could not be loaded.');
    await fixture.whenStable();

    const alert: HTMLElement | null = byTestId('intervention-facilities-error');

    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Linked facilities could not be loaded.');
  });

  it('should show the empty state when nothing is linked', () => {
    expect(byTestId('intervention-facilities-empty')?.textContent).toContain(
      'No facility is linked to this intervention yet.',
    );
  });
});
