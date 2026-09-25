import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import type { InterventionInspectionsTableQuery } from '@features/organization/features/interventions/models';
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
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: signal(false) },
        },
      ],
    });

    fixture = TestBed.createComponent(InterventionInspectionsTable);
    fixture.componentInstance.queryChanged.subscribe((query) =>
      fixture.componentRef.setInput('query', query),
    );
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();
  });

  it('illustrates a loaded, genuinely empty collection', async () => {
    fixture.componentRef.setInput('hasLoaded', true);
    await fixture.whenStable();

    expect(root().querySelector('app-resource-illustration img')?.getAttribute('src')).toBe(
      '/assets/illustrations/resources/light/inspection.svg',
    );
  });

  it.each([
    ['before the first result', 'hasLoaded', false],
    ['while loading', 'loading', true],
    ['after an error', 'error', 'Unable to load'],
    ['with an active query', 'query', { search: '', status: 'closed', result: null }],
    ['on an empty page of a populated collection', 'totalItems', 1],
  ])('does not request an illustration %s', async (_label, input, value) => {
    fixture.componentRef.setInput('hasLoaded', true);
    fixture.componentRef.setInput(input as string, value);
    await fixture.whenStable();

    expect(root().querySelector('app-resource-illustration')).toBeNull();
  });

  it('should render each linked inspection by result and status', async () => {
    fixture.componentRef.setInput('items', [inspection({ result: 'fail', status: 'closed' })]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-inspections-table-row') as HTMLElement;

    expect(row.textContent).toContain('Fail');
    expect(row.textContent).toContain('Closed');
  });

  it('should expose shared search and filters for the linked inspections', async () => {
    fixture.componentRef.setInput('items', [
      inspection({ id: 'inspection-1', result: 'pass' }),
      inspection({ id: 'inspection-2', result: 'fail' }),
    ]);
    await fixture.whenStable();

    const search: HTMLInputElement = byTestId(
      'intervention-inspections-search',
    ) as HTMLInputElement;
    expect(search).not.toBeNull();
    expect(byTestId('intervention-inspections-filters-toggle')).not.toBeNull();

    search.value = 'fail';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(
      root().querySelectorAll('[data-testid="intervention-inspections-table-row"]'),
    ).toHaveLength(1);
    expect(root().textContent).toContain('Fail');
    expect(root().textContent).not.toContain('Pass');
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

    expect(root().querySelectorAll('hlm-skeleton')).toHaveLength(0);
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

  it('should combine status and result filters and retain the other criterion when one is removed', async () => {
    const rows = (): NodeListOf<HTMLElement> =>
      root().querySelectorAll('[data-testid="intervention-inspections-table-row"]');
    const table = fixture.componentInstance as unknown as {
      onStatusFilterChanged(value: string | null): void;
      onResultFilterChanged(value: string | null): void;
      onFieldRemoved(key: string): void;
    };
    fixture.componentRef.setInput('items', [
      inspection({ id: 'passed-closed', status: 'closed', result: 'pass' }),
      inspection({ id: 'failed-closed', status: 'closed', result: 'fail' }),
      inspection({ id: 'failed-draft', status: 'draft', result: 'fail' }),
    ]);
    await fixture.whenStable();

    table.onStatusFilterChanged('closed');
    await fixture.whenStable();
    expect(rows()).toHaveLength(2);

    table.onResultFilterChanged('fail');
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);
    expect(rows()[0]?.textContent).toContain('Fail');

    table.onFieldRemoved('status');
    await fixture.whenStable();
    expect(rows()).toHaveLength(2);
    expect(fixture.componentInstance.query()).toEqual({
      search: '',
      status: null,
      result: 'fail',
    });
  });

  it('should ignore an unknown filter value and clear both selections together', async () => {
    const table = fixture.componentInstance as unknown as {
      onStatusFilterChanged(value: string | null): void;
      onResultFilterChanged(value: string | null): void;
      clearFilters(): void;
    };
    const emitted: InterventionInspectionsTableQuery[] = [];
    fixture.componentInstance.queryChanged.subscribe((query) => emitted.push(query));

    table.onStatusFilterChanged('invalid');
    table.onResultFilterChanged('invalid');
    expect(emitted).toEqual([
      { search: '', status: null, result: null },
      { search: '', status: null, result: null },
    ]);

    fixture.componentRef.setInput('query', { search: 'pump', status: 'closed', result: 'pass' });
    await fixture.whenStable();
    table.clearFilters();
    expect(emitted.at(-1)).toEqual({ search: 'pump', status: null, result: null });
  });

  it('should preserve API rows while server filtering is active', async () => {
    fixture.componentRef.setInput('items', [inspection({ id: 'inspection-1', result: 'pass' })]);
    fixture.componentRef.setInput('query', { search: 'no match', status: 'draft', result: 'fail' });
    fixture.componentRef.setInput('serverFiltering', true);
    await fixture.whenStable();

    expect(
      root().querySelectorAll('[data-testid="intervention-inspections-table-row"]'),
    ).toHaveLength(1);

    fixture.componentRef.setInput('serverFiltering', false);
    await fixture.whenStable();
    expect(
      root().querySelectorAll('[data-testid="intervention-inspections-table-row"]'),
    ).toHaveLength(0);
  });

  it('should find inspections by inspector and notes across loaded rows', async () => {
    fixture.componentRef.setInput('items', [
      inspection({
        id: 'inspection-1',
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
      inspection({ id: 'inspection-2', notes: 'Pump pressure too low' }),
    ]);
    fixture.componentRef.setInput('query', { search: 'jane', status: null, result: null });
    await fixture.whenStable();
    expect(
      root().querySelectorAll('[data-testid="intervention-inspections-table-row"]'),
    ).toHaveLength(1);
    expect(root().textContent).toContain('Jane Doe');

    fixture.componentRef.setInput('query', { search: 'pump pressure', status: null, result: null });
    await fixture.whenStable();
    expect(
      root().querySelectorAll('[data-testid="intervention-inspections-table-row"]'),
    ).toHaveLength(1);
    expect(root().textContent).not.toContain('Jane Doe');
  });

  it('should emit a retry when the error action is activated', async () => {
    const retry = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);
    fixture.componentRef.setInput('error', 'Unable to load linked inspections');
    await fixture.whenStable();

    const button = byTestId('intervention-inspections-error')?.querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
