import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InterventionInspectionsTable } from '../intervention-inspections-table.component';

const inspection = (overrides: Partial<InspectionOutput> = {}): InspectionOutput =>
  ({
    id: 'inspection-1',
    organizationId: 'org-1',
    equipmentId: 'eq-1',
    facilityId: 'facility-1',
    result: 'pass',
    status: 'closed',
    performedAt: '2026-01-05T09:00:00Z',
    inspector: null,
    checklistId: null,
    notes: null,
    signature: null,
    nonConformitiesCount: 0,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InspectionOutput;

describe('InterventionInspectionsTable', () => {
  let fixture: ComponentFixture<InterventionInspectionsTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionInspectionsTable);
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();
  });

  it('should render each linked inspection by result and status', async () => {
    fixture.componentRef.setInput('items', [inspection({ result: 'fail', status: 'closed' })]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-inspection-row') as HTMLElement;

    expect(row.textContent).toContain('Fail');
    expect(row.textContent).toContain('Closed');
  });

  it('should name the inspector when one is recorded', async () => {
    fixture.componentRef.setInput('items', [
      inspection({
        inspector: {
          type: 'user',
          id: 'user-1',
          firstName: 'Jane',
          lastName: 'Doe',
          displayName: 'Jane Doe',
          avatarUrl: null,
          organizationName: null,
        },
      }),
    ]);
    await fixture.whenStable();

    expect(byTestId('intervention-inspection-row')?.textContent).toContain('Jane Doe');
  });

  it('should show a loading indicator while the tab fetch is in flight and nothing has loaded yet', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    const status: HTMLElement | null = byTestId('intervention-inspections-loading');

    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
  });

  it('should not show the loading indicator once inspections are already on screen', async () => {
    fixture.componentRef.setInput('items', [inspection()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(byTestId('intervention-inspections-loading')).toBeNull();
  });

  it('should surface a fetch error as an alert', async () => {
    fixture.componentRef.setInput('error', 'Linked inspections could not be loaded.');
    await fixture.whenStable();

    const alert: HTMLElement | null = byTestId('intervention-inspections-error');

    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Linked inspections could not be loaded.');
  });

  it('should show the empty state when nothing is linked', () => {
    expect(byTestId('intervention-inspections-empty')?.textContent).toContain(
      'No inspection is linked to this intervention yet.',
    );
  });
});
