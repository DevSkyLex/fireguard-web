import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { InterventionChangeOutput } from '@features/organization/features/interventions/models';
import { InterventionChangeTable } from '../intervention-change-table.component';

const change = (overrides: Partial<InterventionChangeOutput> = {}): InterventionChangeOutput =>
  ({
    '@id': '/api/intervention-changes/1',
    '@type': 'InterventionChange',
    id: 'change-1',
    intervention: '/api/interventions/intervention-1',
    workItem: null,
    resource: '/api/equipment/equipment-1',
    patch: { locationLabel: 'Rack B-12' },
    status: 'proposed',
    revision: 1,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionChangeOutput;

describe('InterventionChangeTable', () => {
  let fixture: ComponentFixture<InterventionChangeTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      public observe(): void {}
      public unobserve(): void {}
      public disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  const create = async (changes: readonly InterventionChangeOutput[]): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: signal(false) },
        },
      ],
    });
    fixture = TestBed.createComponent(InterventionChangeTable);
    fixture.componentRef.setInput('changes', changes);
    await fixture.whenStable();
  };

  it('should render only the changes returned by the default API query', async () => {
    const proposed = change();
    await create([proposed, change({ id: 'change-2', status: 'applied' })]);
    fixture.componentRef.setInput('queryChanges', [proposed]);
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="intervention-changes-table"]')).not.toBeNull();
    expect(root().querySelectorAll('[data-testid="intervention-change-row"]').length).toBe(1);
  });

  it('should name the resource kind from the change IRI', async () => {
    await create([change({ resource: '/api/facilities/facility-1' })]);

    expect(root().textContent).toContain('Facility');
  });

  it('should show a readable resource label in the single table', async () => {
    const resourceId = '33333333-3333-4333-8333-333333333333';
    await create([change({ resource: `/api/equipment/${resourceId}` })]);

    expect(root().querySelector('[data-testid="intervention-change-row"]')?.textContent).toContain(
      'Equipment',
    );
    expect(root().querySelector('h3')).toBeNull();
    expect(root().textContent).not.toContain(resourceId);
  });

  it('should render the patch as readable field/value lines', async () => {
    await create([change({ patch: { locationLabel: 'Rack B-12' } })]);

    expect(root().textContent).toContain('Location label');
    expect(root().textContent).toContain('Rack B-12');
  });

  it('should share the table column tracks between headers and rows', async () => {
    await create([change()]);
    fixture.componentRef.setInput('canReject', true);
    await fixture.whenStable();

    const surface = root().querySelector('app-collection-surface');
    const headers = root().querySelectorAll('thead th');
    const cells = root().querySelectorAll('tbody tr:first-child td');

    expect(surface?.className).toContain('[&_[data-slot=table]]:table-fixed');
    expect(headers).toHaveLength(5);
    expect(cells).toHaveLength(5);
    expect(headers[0]?.classList.contains('w-32')).toBe(true);
    expect(headers[1]?.classList.contains('w-32')).toBe(true);
    expect(headers[3]?.classList.contains('w-28')).toBe(true);
    expect(headers[4]?.classList.contains('w-20')).toBe(true);
    expect(surface?.className).toContain('[&_[data-slot=table]]:min-w-[43rem]');
  });

  it('should associate each patch field with its own semantic row', async () => {
    await create([
      change({ patch: { locationLabel: 'A long value '.repeat(40), status: 'active' } }),
    ]);
    fixture.componentRef.setInput('canReject', true);
    await fixture.whenStable();

    const rows = root().querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelectorAll('td[rowspan="2"]')).toHaveLength(3);
    expect(rows[1]?.querySelectorAll('td')).toHaveLength(2);
    expect(rows[1]?.textContent).toContain('Status');
    expect(rows[1]?.textContent).toContain('active');
    expect(rows[1]?.textContent).not.toContain('A long value');
  });

  it('should reserve actions before the first response when rejection is permitted', async () => {
    await create([]);
    fixture.componentRef.setInput('canReject', true);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('thead th')).toHaveLength(5);
    expect(root().querySelectorAll('tbody tr:first-child td')).toHaveLength(5);
  });

  it('should keep first-load skeleton cells aligned with the visible headers', async () => {
    await create([]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    const headers = root().querySelectorAll('thead th');
    const cells = root().querySelectorAll('tbody tr:first-child td');

    expect(headers).toHaveLength(4);
    expect(cells).toHaveLength(4);
  });

  it('should show the applied-at-publication caption', async () => {
    await create([change()]);

    expect(root().textContent).toContain(
      'Review proposed values and consult rejected or applied changes.',
    );
  });

  it('should show a history icon in the empty state', async () => {
    await create([]);

    const empty = root().querySelector<HTMLElement>('[data-testid="intervention-changes-empty"]');

    expect(empty?.parentElement?.classList.contains('border-dashed')).toBe(true);
    expect(empty?.querySelector('ng-icon[name="lucideHistory"]')).not.toBeNull();
  });

  it('should use the shared status filter with the proposed state selected by default', async () => {
    await create([change(), change({ id: 'change-2', status: 'applied' })]);

    expect(root().querySelector('[data-testid="intervention-changes-search"]')).not.toBeNull();
    expect(
      root().querySelector('[data-testid="intervention-changes-filters-toggle"]'),
    ).not.toBeNull();
    const filter = root().querySelector<HTMLButtonElement>(
      '[data-testid="intervention-changes-filter-status"]',
    );
    expect(filter?.textContent).toContain('Status');
    expect(filter?.textContent).toContain('Proposed');
    expect(root().querySelector('#intervention-changes-filter-bar')).not.toBeNull();
    expect(root().querySelector('hlm-select')).toBeNull();
  });

  it('should delegate search to the API and render only the returned rows', async () => {
    await create([
      change({ patch: { locationLabel: 'Rack B-12' } }),
      change({ id: 'change-2', patch: { locationLabel: 'Bay C-4' } }),
    ]);
    const searches: string[] = [];
    fixture.componentInstance.queryChanged.subscribe(({ search }) => searches.push(search));

    const search: HTMLInputElement = root().querySelector(
      '[data-testid="intervention-changes-search"]',
    ) as HTMLInputElement;
    search.value = 'rack b-12';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(searches).toContain('rack b-12');
    expect(root().querySelectorAll('[data-testid="intervention-change-row"]')).toHaveLength(2);

    fixture.componentRef.setInput('queryChanges', [
      change({ patch: { locationLabel: 'Rack B-12' } }),
    ]);
    await fixture.whenStable();

    expect(root().querySelectorAll('[data-testid="intervention-change-row"]')).toHaveLength(1);
    expect(root().textContent).toContain('Rack B-12');
    expect(root().textContent).not.toContain('Bay C-4');
  });

  it('should emit the complete server query when search changes', async () => {
    await create([change()]);
    const searches: string[] = [];
    fixture.componentInstance.queryChanged.subscribe(({ search }) => searches.push(search));

    const search = root().querySelector(
      '[data-testid="intervention-changes-search"]',
    ) as HTMLInputElement;
    search.value = 'decommissioned';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(searches).toContain('decommissioned');
  });

  it('should show every history state when the shared status chip is removed', async () => {
    await create([change(), change({ id: 'change-2', status: 'applied' })]);

    fixture.debugElement
      .query(By.css('app-collection-filter-bar'))
      .triggerEventHandler('fieldRemoved', 'status');
    await fixture.whenStable();

    expect(root().querySelectorAll('[data-testid="intervention-change-row"]')).toHaveLength(2);
  });

  it('should offer no reject control unless the host grants it', async () => {
    await create([change()]);

    expect(root().querySelector('[data-testid="intervention-change-reject"]')).toBeNull();
  });

  it('should emit the rejected change id, and only lock its own row', async () => {
    const rejectedIds: string[] = [];
    await create([change(), change({ id: 'change-2' })]);
    fixture.componentRef.setInput('canReject', true);
    fixture.componentRef.setInput('pendingChangeIds', new Set(['change-2']));
    fixture.componentInstance.rejected.subscribe((id: string) => rejectedIds.push(id));
    await fixture.whenStable();

    const buttons = root().querySelectorAll<HTMLButtonElement>(
      '[data-testid="intervention-change-reject"]',
    );
    expect(buttons.length).toBe(2);
    expect(buttons[0]?.disabled).toBe(false);
    expect(buttons[1]?.disabled).toBe(true);

    buttons[0]?.click();
    expect(rejectedIds).toEqual(['change-1']);
  });
});
