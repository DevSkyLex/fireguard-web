import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InterventionInspectionsTable);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();
  });

  it('should render each linked inspection by result and status', async () => {
    fixture.componentRef.setInput('items', [inspection({ result: 'fail', status: 'closed' })]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-inspections-table-row') as HTMLElement;

    expect(row.textContent).toContain('Fail');
    expect(row.textContent).toContain('Closed');
  });

  it('should link a published inspection row to its detail route', async () => {
    fixture.componentRef.setInput('items', [
      inspection({ id: 'inspection-1', recordStatus: 'published' }),
    ]);
    await fixture.whenStable();

    const link: HTMLAnchorElement | null = byTestId(
      'intervention-inspections-table-row',
    )?.querySelector('a') as HTMLAnchorElement | null;

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/inspections/inspection-1');
  });

  it('should render a draft-record row as plain text, not a link', async () => {
    fixture.componentRef.setInput('items', [
      inspection({ id: 'inspection-1', recordStatus: 'draft' }),
    ]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-inspections-table-row') as HTMLElement;

    expect(row.querySelector('a')).toBeNull();
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

    expect(byTestId('intervention-inspections-table-row')?.textContent).toContain('Jane Doe');
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

  it('should not show the skeleton rows once inspections are already on screen', async () => {
    fixture.componentRef.setInput('items', [inspection()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
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

  it('should show the "Show more" button when the server holds more inspections than are loaded', async () => {
    fixture.componentRef.setInput('items', [inspection()]);
    fixture.componentRef.setInput('totalItems', 2);
    await fixture.whenStable();

    expect(byTestId('intervention-inspections-load-more')).not.toBeNull();
  });

  it('should hide the "Show more" button once every inspection is loaded', async () => {
    fixture.componentRef.setInput('items', [inspection()]);
    fixture.componentRef.setInput('totalItems', 1);
    await fixture.whenStable();

    expect(byTestId('intervention-inspections-load-more')).toBeNull();
  });

  it('should emit loadMoreRequested when the "Show more" button is pressed', async () => {
    fixture.componentRef.setInput('items', [inspection()]);
    fixture.componentRef.setInput('totalItems', 2);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.loadMoreRequested.subscribe(requested);
    byTestId('intervention-inspections-load-more')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('should disable the "Show more" button and show the spinner label while loading more', async () => {
    fixture.componentRef.setInput('items', [inspection()]);
    fixture.componentRef.setInput('totalItems', 2);
    fixture.componentRef.setInput('loadingMore', true);
    await fixture.whenStable();

    const button = byTestId('intervention-inspections-load-more') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Loading…');
  });
});
