import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT, type ThemePort } from '@core/theme';
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

    fixture = TestBed.createComponent(InterventionEquipmentTable);
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
      '/assets/illustrations/resources/light/equipment.svg',
    );
  });

  it.each([
    ['before the first result', 'hasLoaded', false],
    ['while loading', 'loading', true],
    ['after an error', 'error', 'Unable to load'],
    ['with an active query', 'query', { search: 'missing', type: null, status: null }],
    ['on an empty page of a populated collection', 'totalItems', 1],
  ])('does not request an illustration %s', async (_label, input, value) => {
    fixture.componentRef.setInput('hasLoaded', true);
    fixture.componentRef.setInput(input as string, value);
    await fixture.whenStable();

    expect(root().querySelector('app-resource-illustration')).toBeNull();
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

  it('should expose shared search and filters for the linked equipment', async () => {
    fixture.componentRef.setInput('items', [
      equipment({ id: 'eq-1', serialNumber: 'SN-001', locationLabel: 'Hall A' }),
      equipment({ id: 'eq-2', serialNumber: 'SN-002', locationLabel: 'Hall B' }),
    ]);
    await fixture.whenStable();

    const search: HTMLInputElement = byTestId('intervention-equipment-search') as HTMLInputElement;
    expect(search).not.toBeNull();
    expect(byTestId('intervention-equipment-filters-toggle')).not.toBeNull();

    search.value = 'sn-002';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(
      root().querySelectorAll('[data-testid="intervention-equipment-table-row"]'),
    ).toHaveLength(1);
    expect(root().textContent).toContain('SN-002');
    expect(root().textContent).not.toContain('SN-001');
  });

  it('should emit search changes when the host enables server filtering', async () => {
    fixture.componentRef.setInput('serverFiltering', true);
    await fixture.whenStable();
    const searches: string[] = [];
    fixture.componentInstance.queryChanged.subscribe(({ search }) => searches.push(search));

    const search = byTestId('intervention-equipment-search') as HTMLInputElement;
    search.value = 'sn-002';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(searches).toContain('sn-002');
  });

  it('should apply type and status together to loaded rows', async () => {
    fixture.componentRef.setInput('items', [
      equipment({ id: 'eq-1', type: 'fire_extinguisher', status: 'operational' }),
      equipment({ id: 'eq-2', type: 'smoke_detector', status: 'operational' }),
      equipment({ id: 'eq-3', type: 'fire_extinguisher', status: 'decommissioned' }),
    ]);
    fixture.componentRef.setInput('query', {
      search: '',
      type: 'fire_extinguisher',
      status: 'operational',
    });
    await fixture.whenStable();

    const rows = root().querySelectorAll('[data-testid="intervention-equipment-table-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain('SN-001');
    expect(fixture.componentInstance['activeFilterKeys']()).toEqual(['type', 'status']);

    fixture.componentRef.setInput('query', {
      search: '',
      type: 'smoke_detector',
      status: 'decommissioned',
    });
    await fixture.whenStable();
    expect(byTestId('intervention-equipment-empty')?.textContent).toContain(
      'No equipment matches the current search or filters',
    );
  });

  it('should retain server-returned rows even when the local query would filter them out', async () => {
    fixture.componentRef.setInput('items', [equipment({ type: 'smoke_detector' })]);
    fixture.componentRef.setInput('serverFiltering', true);
    fixture.componentRef.setInput('query', {
      search: 'missing',
      type: 'fire_extinguisher',
      status: 'decommissioned',
    });
    await fixture.whenStable();

    expect(
      root().querySelectorAll('[data-testid="intervention-equipment-table-row"]'),
    ).toHaveLength(1);
    expect(byTestId('intervention-equipment-empty')).toBeNull();
  });

  it('should preserve search and the other filter as each criterion changes', async () => {
    fixture.componentRef.setInput('query', { search: 'SN-001', type: null, status: null });
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.queryChanged.subscribe(emitted);

    fixture.componentInstance['onTypeFilterChanged']('fire_extinguisher');
    await fixture.whenStable();
    fixture.componentInstance['onStatusFilterChanged']('operational');
    await fixture.whenStable();
    expect(emitted).toHaveBeenLastCalledWith({
      search: 'SN-001',
      type: 'fire_extinguisher',
      status: 'operational',
    });

    fixture.componentInstance['onFieldRemoved']('type');
    await fixture.whenStable();
    expect(emitted).toHaveBeenLastCalledWith({
      search: 'SN-001',
      type: null,
      status: 'operational',
    });

    fixture.componentInstance['clearFilters']();
    expect(emitted).toHaveBeenLastCalledWith({
      search: 'SN-001',
      type: null,
      status: null,
    });
  });

  it('should discard unrecognized filter values and ignore unknown field keys', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.queryChanged.subscribe(emitted);

    fixture.componentInstance['onTypeFilterChanged']('unknown-type');
    fixture.componentInstance['onStatusFilterChanged']('unknown-status');
    fixture.componentInstance['onFieldRemoved']('unknown-field');

    expect(fixture.componentInstance['query']()).toEqual({
      search: '',
      type: null,
      status: null,
    });
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
    const toggle = byTestId('intervention-equipment-filters-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root().querySelector('#intervention-equipment-filter-bar')).not.toBeNull();
    expect(fixture.componentInstance['filterTemplates']()['type']).toBeDefined();
    expect(fixture.componentInstance['filterTemplates']()['status']).toBeDefined();

    toggle.click();
    await fixture.whenStable();
    expect(root().querySelector('#intervention-equipment-filter-bar')).toBeNull();
  });

  it('should link a published equipment row to its detail route', async () => {
    fixture.componentRef.setInput('items', [equipment({ id: 'eq-1', recordStatus: 'published' })]);
    await fixture.whenStable();

    const link: HTMLAnchorElement | null = byTestId(
      'intervention-equipment-table-row',
    )?.querySelector('a') as HTMLAnchorElement | null;

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/equipments/eq-1');
    expect(link?.getAttribute('aria-label')).toContain('SN-001');
  });

  it('should use the visible type as the link name when an equipment has no serial number', async () => {
    fixture.componentRef.setInput('items', [equipment({ serialNumber: null })]);
    await fixture.whenStable();

    const link = byTestId('intervention-equipment-table-row')?.querySelector('a');
    expect(link?.textContent).toContain('fire extinguisher');
    expect(link?.hasAttribute('aria-label')).toBe(false);
  });

  it('should show empty-value fallbacks when brand, model and location are absent', async () => {
    fixture.componentRef.setInput('items', [
      equipment({ brand: null, model: null, locationLabel: null }),
    ]);
    await fixture.whenStable();

    const row = byTestId('intervention-equipment-table-row') as HTMLElement;
    const cells = row.querySelectorAll('td');
    expect(cells[1]?.textContent?.trim()).toBe('—');
    expect(cells[3]?.textContent?.trim()).toBe('—');
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

  it('should emit retry from the table error action', async () => {
    fixture.componentRef.setInput('error', 'Linked equipment could not be loaded.');
    await fixture.whenStable();
    const retry = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);

    byTestId('intervention-equipment-error')?.querySelector('button')?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('should show the empty state when nothing is linked', () => {
    const empty: HTMLElement | null = byTestId('intervention-equipment-empty');

    expect(empty?.textContent).toContain('No equipment is linked to this intervention yet.');
    expect(empty?.querySelector('ng-icon[name="lucideWrench"]')).not.toBeNull();
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
