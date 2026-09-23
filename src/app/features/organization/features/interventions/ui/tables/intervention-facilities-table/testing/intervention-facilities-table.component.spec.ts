import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT, type ThemePort } from '@core/theme';
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

    fixture = TestBed.createComponent(InterventionFacilitiesTable);
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
      '/assets/illustrations/resources/light/site.svg',
    );
  });

  it.each([
    ['before the first result', 'hasLoaded', false],
    ['while loading', 'loading', true],
    ['after an error', 'error', 'Unable to load'],
    ['with an active query', 'query', { search: '', type: 'building', status: null }],
    ['on an empty page of a populated collection', 'totalItems', 1],
  ])('does not request an illustration %s', async (_label, input, value) => {
    fixture.componentRef.setInput('hasLoaded', true);
    fixture.componentRef.setInput(input as string, value);
    await fixture.whenStable();

    expect(root().querySelector('app-resource-illustration')).toBeNull();
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

  it('should expose shared search and filters for the linked facilities', async () => {
    fixture.componentRef.setInput('items', [
      facility({ id: 'facility-1', name: 'Main warehouse' }),
      facility({ id: 'facility-2', name: 'North annex', code: 'ANN-2' }),
    ]);
    await fixture.whenStable();

    const search: HTMLInputElement = byTestId('intervention-facilities-search') as HTMLInputElement;
    expect(search).not.toBeNull();
    expect(byTestId('intervention-facilities-filters-toggle')).not.toBeNull();

    search.value = 'annex';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(
      root().querySelectorAll('[data-testid="intervention-facilities-table-row"]'),
    ).toHaveLength(1);
    expect(root().textContent).toContain('North annex');
    expect(root().textContent).not.toContain('Main warehouse');
  });

  it('should emit search changes to a server-filtering host', async () => {
    fixture.componentRef.setInput('serverFiltering', true);
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.queryChanged.subscribe(emitted);

    const search = byTestId('intervention-facilities-search') as HTMLInputElement;
    search.value = 'north';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(emitted).toHaveBeenLastCalledWith({ search: 'north', type: null, status: null });
  });

  it('should apply type and status together to loaded facilities', async () => {
    fixture.componentRef.setInput('items', [
      facility({ id: 'facility-1', type: 'building', status: 'active' }),
      facility({ id: 'facility-2', type: 'site', status: 'active' }),
      facility({ id: 'facility-3', type: 'building', status: 'archived' }),
    ]);
    fixture.componentRef.setInput('query', { search: '', type: 'building', status: 'active' });
    await fixture.whenStable();

    const rows = root().querySelectorAll('[data-testid="intervention-facilities-table-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain('Main warehouse');
    expect(fixture.componentInstance['activeFilterKeys']()).toEqual(['type', 'status']);

    fixture.componentRef.setInput('query', { search: '', type: 'site', status: 'archived' });
    await fixture.whenStable();
    expect(byTestId('intervention-facilities-empty')?.textContent).toContain(
      'No facilities match the current search or filters',
    );
  });

  it('should retain server-returned facilities even when the local query would filter them out', async () => {
    fixture.componentRef.setInput('items', [facility({ type: 'site' })]);
    fixture.componentRef.setInput('serverFiltering', true);
    fixture.componentRef.setInput('query', {
      search: 'missing',
      type: 'building',
      status: 'archived',
    });
    await fixture.whenStable();

    expect(
      root().querySelectorAll('[data-testid="intervention-facilities-table-row"]'),
    ).toHaveLength(1);
    expect(byTestId('intervention-facilities-empty')).toBeNull();
  });

  it('should preserve search and the other filter as each criterion changes', async () => {
    fixture.componentRef.setInput('query', { search: 'WH-1', type: null, status: null });
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.queryChanged.subscribe(emitted);

    fixture.componentInstance['onTypeFilterChanged']('building');
    await fixture.whenStable();
    fixture.componentInstance['onStatusFilterChanged']('active');
    await fixture.whenStable();
    expect(emitted).toHaveBeenLastCalledWith({
      search: 'WH-1',
      type: 'building',
      status: 'active',
    });

    fixture.componentInstance['onFieldRemoved']('type');
    await fixture.whenStable();
    expect(emitted).toHaveBeenLastCalledWith({ search: 'WH-1', type: null, status: 'active' });

    fixture.componentInstance['clearFilters']();
    expect(emitted).toHaveBeenLastCalledWith({ search: 'WH-1', type: null, status: null });
  });

  it('should discard unrecognized filter values and ignore unknown field keys', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.queryChanged.subscribe(emitted);

    fixture.componentInstance['onTypeFilterChanged']('unknown-type');
    fixture.componentInstance['onStatusFilterChanged']('unknown-status');
    fixture.componentInstance['onFieldRemoved']('unknown-field');

    expect(fixture.componentInstance['query']()).toEqual({ search: '', type: null, status: null });
    expect(emitted).toHaveBeenCalledTimes(2);
  });

  it('should keep only the selected filter popover open', () => {
    fixture.componentInstance['onFieldPicked']('type');
    expect(fixture.componentInstance['fieldPopoverState']('type')).toBe('open');
    expect(fixture.componentInstance['fieldPopoverState']('status')).toBe('closed');

    fixture.componentInstance['onFilterPopoverStateChanged']('status', 'closed');
    expect(fixture.componentInstance['fieldPopoverState']('type')).toBe('open');
    fixture.componentInstance['onFilterPopoverStateChanged']('status', 'open');
    fixture.componentInstance['onFilterPopoverStateChanged']('status', 'closed');
    expect(fixture.componentInstance['fieldPopoverState']('status')).toBe('closed');
  });

  it('should mount both value controls when the filter bar is opened', async () => {
    const toggle = byTestId('intervention-facilities-filters-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root().querySelector('#intervention-facilities-filter-bar')).not.toBeNull();
    expect(fixture.componentInstance['filterTemplates']()['type']).toBeDefined();
    expect(fixture.componentInstance['filterTemplates']()['status']).toBeDefined();

    toggle.click();
    await fixture.whenStable();
    expect(root().querySelector('#intervention-facilities-filter-bar')).toBeNull();
  });

  it('should find linked facilities by their code and street address', async () => {
    fixture.componentRef.setInput('items', [
      facility({ id: 'facility-1', code: 'WH-1', address: '25 North Street' }),
      facility({ id: 'facility-2', name: 'South annex', code: 'SA-2', address: '4 South Road' }),
    ]);
    fixture.componentRef.setInput('query', { search: 'north street', type: null, status: null });
    await fixture.whenStable();
    expect(
      root().querySelectorAll('[data-testid="intervention-facilities-table-row"]'),
    ).toHaveLength(1);
    expect(byTestId('intervention-facilities-table-row')?.textContent).toContain('Main warehouse');

    fixture.componentRef.setInput('query', { search: 'SA-2', type: null, status: null });
    await fixture.whenStable();
    expect(byTestId('intervention-facilities-table-row')?.textContent).toContain('South annex');
  });

  it('should link a published facility to its detail route', async () => {
    fixture.componentRef.setInput('items', [
      facility({ id: 'facility-1', name: 'Main warehouse', recordStatus: 'published' }),
    ]);
    await fixture.whenStable();

    const link: HTMLAnchorElement | null = byTestId(
      'intervention-facilities-table-row',
    )?.querySelector('a') as HTMLAnchorElement | null;

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/facilities/facility-1');
  });

  it('should render a draft-record row as plain text, not a link', async () => {
    fixture.componentRef.setInput('items', [
      facility({ id: 'facility-1', name: 'Main warehouse', recordStatus: 'draft' }),
    ]);
    await fixture.whenStable();

    const row: HTMLElement = byTestId('intervention-facilities-table-row') as HTMLElement;

    expect(row.querySelector('a')).toBeNull();
    expect(row.textContent).toContain('Main warehouse');
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

  it('should emit retry from the table error action', async () => {
    fixture.componentRef.setInput('error', 'Linked facilities could not be loaded.');
    await fixture.whenStable();
    const retry = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);

    byTestId('intervention-facilities-error')?.querySelector('button')?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('should show the empty state when nothing is linked', () => {
    expect(byTestId('intervention-facilities-empty')?.textContent).toContain(
      'No facility is linked to this intervention yet.',
    );
  });

  it('should show the "Show more" button when the server holds more facilities than are loaded', async () => {
    fixture.componentRef.setInput('items', [facility()]);
    fixture.componentRef.setInput('totalItems', 2);
    await fixture.whenStable();

    expect(byTestId('intervention-facilities-load-more')).not.toBeNull();
  });

  it('should hide the "Show more" button once every facility is loaded', async () => {
    fixture.componentRef.setInput('items', [facility()]);
    fixture.componentRef.setInput('totalItems', 1);
    await fixture.whenStable();

    expect(byTestId('intervention-facilities-load-more')).toBeNull();
  });

  it('should emit loadMoreRequested when the "Show more" button is pressed', async () => {
    fixture.componentRef.setInput('items', [facility()]);
    fixture.componentRef.setInput('totalItems', 2);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.loadMoreRequested.subscribe(requested);
    byTestId('intervention-facilities-load-more')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('should disable the "Show more" button and show the spinner label while loading more', async () => {
    fixture.componentRef.setInput('items', [facility()]);
    fixture.componentRef.setInput('totalItems', 2);
    fixture.componentRef.setInput('loadingMore', true);
    await fixture.whenStable();

    const button = byTestId('intervention-facilities-load-more') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Loading…');
  });
});
