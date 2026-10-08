import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { toStoreError } from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type {
  MaintenanceFinancialDossierOutput,
  MaintenanceReportScopeSelection,
} from '@features/organization/features/maintenance-costs/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { MaintenanceFinancialDirectory } from '../maintenance-financial-directory.component';

class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

function dossier(
  overrides: Partial<MaintenanceFinancialDossierOutput> = {},
): MaintenanceFinancialDossierOutput {
  return {
    '@id': '/api/organizations/organization-1/maintenance-cost/dossiers/work-1',
    '@type': 'MaintenanceFinancialDossier',
    id: '46a171e4-c87d-4d1a-bde4-9fc4042ab222',
    number: 81,
    name: 'Replace reception extinguisher',
    type: 'corrective',
    status: 'published',
    publishedAt: '2026-01-15T13:30:00Z',
    snapshotState: 'available',
    identityComplete: true,
    site: { id: '26bf4877-7a19-4c03-94a9-292cb96a3a58', name: 'Recorded Lyon site' },
    customer: { id: '932c30e3-dcd1-4575-8a11-ebcb9c7d1af8', name: 'Recorded customer' },
    equipment: [
      {
        id: 'd43c7404-311c-4a6f-8d1f-0e2ba8a0d459',
        name: 'Reception extinguisher',
        assetReference: 'EXT-081',
        site: { id: '26bf4877-7a19-4c03-94a9-292cb96a3a58', name: 'Recorded Lyon site' },
        customer: { id: '932c30e3-dcd1-4575-8a11-ebcb9c7d1af8', name: 'Recorded customer' },
      },
    ],
    ...overrides,
  };
}

function text(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('MaintenanceFinancialDirectory', () => {
  let fixture: ComponentFixture<MaintenanceFinancialDirectory>;
  let searches: string[];
  let scopeSelections: MaintenanceReportScopeSelection[];
  let pages: number[];
  let pageSizes: number[];
  let retryCount: number;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const searchInput = (): HTMLInputElement => {
    const input = root().querySelector<HTMLInputElement>('#maintenance-financial-search');
    if (!input) throw new Error('Missing financial search input');
    return input;
  };
  const action = (label: string): HTMLButtonElement => {
    const button = Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => text(candidate).startsWith(label),
    );
    if (!button) throw new Error('Missing financial directory action ' + label);
    return button;
  };
  const setSearch = async (value: string): Promise<void> => {
    const input = searchInput();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  beforeEach(async () => {
    const theme: ThemePort = {
      theme: signal('light'),
      resolvedTheme: signal('light'),
      setTheme: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: THEME_PORT, useValue: theme },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone: 'UTC' }) },
        },
      ],
    });
    fixture = TestBed.createComponent(MaintenanceFinancialDirectory);
    fixture.componentRef.setInput('organizationId', 'organization-1');
    fixture.componentRef.setInput('scope', 'organization-1/session-1');
    fixture.componentRef.setInput('items', [dossier()]);
    fixture.componentRef.setInput('totalItems', 1);
    fixture.componentRef.setInput('search', 'initial reference');
    searches = [];
    scopeSelections = [];
    pages = [];
    pageSizes = [];
    retryCount = 0;
    fixture.componentInstance.searchSubmitted.subscribe((value) => searches.push(value));
    fixture.componentInstance.scopeSelected.subscribe((value) => scopeSelections.push(value));
    fixture.componentInstance.pageChanged.subscribe((value) => pages.push(value));
    fixture.componentInstance.pageSizeChanged.subscribe((value) => pageSizes.push(value));
    fixture.componentInstance.retryRequested.subscribe(() => retryCount++);
    await fixture.whenStable();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('submits trimmed name or reference text without changing local pagination or scope', async () => {
    await setSearch('  INT-2026-0081  ');
    await submit();

    expect(searches).toEqual(['INT-2026-0081']);
    expect(scopeSelections).toEqual([]);
    expect(pages).toEqual([]);
    expect(searchInput().value).toBe('  INT-2026-0081  ');
  });

  it('accepts exactly 160 search characters and rejects a longer search with field feedback', async () => {
    await setSearch('a'.repeat(160));
    await submit();
    expect(searches).toEqual(['a'.repeat(160)]);

    await setSearch('a'.repeat(161));
    await submit();
    expect(searches).toEqual(['a'.repeat(160)]);
    expect(text(root().querySelector('hlm-field-error'))).toBe(
      'Use at most 160 characters for the work reference or name.',
    );
  });

  it('preserves edited search across pending, failed and ordinary successful server reads', async () => {
    await setSearch('private unsent query');
    fixture.componentRef.setInput('pending', true);
    fixture.componentRef.setInput('search', 'new server reference');
    await fixture.whenStable();
    expect(searchInput().value).toBe('private unsent query');

    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('error', toStoreError(new Error('Directory unavailable')));
    await fixture.whenStable();
    expect(searchInput().value).toBe('private unsent query');

    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('items', [dossier({ name: 'Refreshed work label' })]);
    await fixture.whenStable();
    expect(searchInput().value).toBe('private unsent query');
    expect(root().textContent).toContain('Refreshed work label');
  });

  it('adopts the explicit reset query and clears private edits on a supplied session replacement', async () => {
    await setSearch('private draft');
    fixture.componentRef.setInput('search', 'reset reference');
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    expect(searchInput().value).toBe('reset reference');

    await setSearch('new private draft');
    fixture.componentRef.setInput('search', '');
    fixture.componentRef.setInput('scope', 'organization-1/session-2');
    await fixture.whenStable();
    expect(searchInput().value).toBe('');
    expect(searches).toEqual([]);
  });

  it('clears only the search text and emits empty search intent', async () => {
    await setSearch('repair reference');
    action('Clear search').click();
    await fixture.whenStable();

    expect(searchInput().value).toBe('');
    expect(searches).toEqual(['']);
    expect(scopeSelections).toEqual([]);
    expect(root().textContent).toContain('Recorded Lyon site');
  });

  it('emits site or customer replacement scopes without carrying incompatible prior filters', () => {
    const entry = dossier();
    action('Limit to site').click();
    action('Limit to customer').click();

    expect(scopeSelections).toEqual([{ site: entry.site }, { customer: entry.customer }]);
    expect(searches).toEqual([]);
  });

  it('emits equipment together with only its own compatible named site and customer context', () => {
    const entry = dossier();
    action('Limit to equipment').click();

    expect(scopeSelections).toEqual([
      { equipment: entry.equipment[0], site: entry.site, customer: entry.customer },
    ]);
    expect(text(action('Limit to equipment'))).toBe(
      'Limit to equipment: EXT-081 · Reception extinguisher',
    );
  });

  it('keeps two captured assignments of the same equipment distinct and emits the clicked second scope', async () => {
    const first = dossier().equipment[0];
    const second = {
      ...first,
      name: 'Reception extinguisher after transfer',
      site: { id: 'c02b929b-4c49-47c1-b8dc-8f1dd9769d56', name: 'Recorded Paris site' },
      customer: { id: 'bddf901a-d6e1-4640-8178-1648d3b08b51', name: 'Second recorded customer' },
    };
    const warnings = vi.spyOn(console, 'warn');
    try {
      fixture.componentRef.setInput('items', [dossier({ equipment: [first, second] })]);
      await fixture.whenStable();
      const buttons = [
        ...root().querySelectorAll<HTMLButtonElement>(
          '[aria-label="Equipment report filters"] button',
        ),
      ];
      expect(buttons).toHaveLength(2);
      expect(
        warnings.mock.calls.some((call) => call.some((value) => String(value).includes('NG0955'))),
      ).toBe(false);
      buttons[1]?.click();
      expect(scopeSelections).toEqual([
        { equipment: second, site: second.site, customer: second.customer },
      ]);
      fixture.componentRef.setInput('items', [dossier({ equipment: [second, first] })]);
      await fixture.whenStable();
      const reordered = [
        ...root().querySelectorAll<HTMLButtonElement>(
          '[aria-label="Equipment report filters"] button',
        ),
      ];
      expect(reordered[0]).toBe(buttons[1]);
      reordered[0]?.click();
      expect(scopeSelections[1]).toEqual({
        equipment: second,
        site: second.site,
        customer: second.customer,
      });
    } finally {
      warnings.mockRestore();
    }
  });

  it('omits unavailable site and customer context for an equipment-only historical dossier', async () => {
    const entry = dossier({
      site: null,
      customer: null,
      identityComplete: false,
      equipment: [{ ...dossier().equipment[0], site: null, customer: null }],
    });
    fixture.componentRef.setInput('items', [entry]);
    await fixture.whenStable();
    action('Limit to equipment').click();

    expect(scopeSelections).toEqual([{ equipment: entry.equipment[0] }]);
    expect(root().textContent).not.toContain('Limit to site');
    expect(root().textContent).not.toContain('Limit to customer');
  });

  it('uses the selected equipment context instead of the root dossier in a multi-site campaign', async () => {
    const equipment = {
      ...dossier().equipment[0],
      site: { id: 'equipment-site-b', name: 'Equipment site B' },
      customer: { id: 'equipment-customer-b', name: 'Equipment customer B' },
    };
    fixture.componentRef.setInput('items', [dossier({ equipment: [equipment] })]);
    await fixture.whenStable();
    action('Limit to equipment').click();
    expect(scopeSelections).toEqual([
      { equipment, site: equipment.site, customer: equipment.customer },
    ]);
  });

  it.each([null, undefined])(
    'never replaces unavailable per-equipment context %s with a different dossier scope',
    async (context) => {
      const equipment = { ...dossier().equipment[0], site: context, customer: context };
      fixture.componentRef.setInput('items', [dossier({ equipment: [equipment] })]);
      await fixture.whenStable();
      action('Limit to equipment').click();
      expect(scopeSelections).toEqual([{ equipment }]);
    },
  );

  it('renders native dossier list items and a named equipment action group', () => {
    const list = root().querySelector('ul[data-testid="maintenance-financial-items"]');
    expect(list?.querySelectorAll(':scope > li')).toHaveLength(1);
    const group = list?.querySelector('fieldset');
    expect(group?.getAttribute('aria-label')).toBe('Equipment report filters');
    expect(group?.querySelectorAll('button')).toHaveLength(dossier().equipment.length);
    expect(list?.querySelector('[role="listitem"]')).toBeNull();
  });

  it('opens the private financial route with the owning organization and exact work query', () => {
    const entry = dossier();
    const link = root().querySelector<HTMLAnchorElement>('article a');

    expect(text(link)).toBe('Open financial dossier');
    expect(link?.getAttribute('href')).toBe(
      '/organizations/organization-1/maintenance-costs?interventionId=' + entry.id,
    );
    expect(root().querySelector('article a[href*="/interventions/"]')).toBeNull();
  });

  it('shows missing historical identity and unnamed equipment without a raw UUID fallback', async () => {
    const entry = dossier({
      snapshotState: 'snapshot_missing',
      identityComplete: false,
      publishedAt: null,
      site: null,
      customer: null,
      equipment: [{ id: 'e26a36ba-e705-499d-a5fe-5c3eeab5ccdf', name: null, assetReference: null }],
    });
    fixture.componentRef.setInput('items', [entry]);
    await fixture.whenStable();

    expect(root().textContent).toContain('Historical snapshot missing');
    expect(root().textContent).toContain(
      'Historical identity is incomplete. Only available named filters can be selected.',
    );
    expect(text(action('Limit to equipment'))).toBe('Limit to equipment: Unnamed equipment');
    expect(root().textContent).not.toContain(entry.id);
    expect(root().textContent).not.toContain(entry.equipment[0].id);
    expect(root().textContent).not.toContain('Published on');
  });

  it.each([
    ['available', 'Published snapshot'],
    ['snapshot_missing', 'Historical snapshot missing'],
    ['live', 'Current work'],
  ] as const)('distinguishes the %s identity provenance', async (snapshotState, expected) => {
    fixture.componentRef.setInput('items', [dossier({ snapshotState })]);
    await fixture.whenStable();
    expect(text(root().querySelector('[hlmBadge]'))).toBe(expected);
  });

  it('retains rows and search after failure and emits a retry without a new search command', async () => {
    await setSearch('repair draft');
    fixture.componentRef.setInput('error', toStoreError(new Error('Directory unavailable')));
    await fixture.whenStable();
    action('Retry directory').click();

    expect(text(root().querySelector('[role="alert"]'))).toContain('Directory unavailable');
    expect(root().querySelectorAll('article')).toHaveLength(1);
    expect(root().textContent).toContain('Replace reception extinguisher');
    expect(searchInput().value).toBe('repair draft');
    expect(retryCount).toBe(1);
    expect(searches).toEqual([]);
  });

  it('retains named rows but blocks search, clear and scope actions while a read is pending', async () => {
    await setSearch('repair draft');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    action('Clear search').click();
    action('Limit to site').click();
    action('Limit to customer').click();
    action('Limit to equipment').click();

    expect(searches).toEqual([]);
    expect(scopeSelections).toEqual([]);
    expect(searchInput().value).toBe('repair draft');
    expect(root().querySelectorAll('article')).toHaveLength(1);
    expect(text(root().querySelector('[role="status"]'))).toBe('Reading financial dossiers');
    expect(root().querySelector('section')?.getAttribute('aria-busy')).toBe('true');
  });

  it('pages using more than 500 server results and forwards bounded page-size intent', async () => {
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('itemsPerPage', 25);
    fixture.componentRef.setInput('totalItems', 1131);
    await fixture.whenStable();

    expect(text(root().querySelector('[data-testid="maintenance-financial-row-count"]'))).toBe(
      '1 of 1131 rows shown',
    );
    expect(text(root().querySelector('[data-testid="maintenance-financial-page-indicator"]'))).toBe(
      'Page 2 of 46',
    );
    root()
      .querySelector<HTMLButtonElement>('[data-testid="maintenance-financial-page-last"]')
      ?.click();
    fixture.debugElement.query(By.css('hlm-select')).triggerEventHandler('valueChange', 120);

    expect(pages).toEqual([46]);
    expect(pageSizes).toEqual([120]);
    expect(fixture.componentInstance.page()).toBe(2);
    expect(fixture.componentInstance.items()).toHaveLength(1);
  });

  it('distinguishes a completed empty search from a pending read and an initial failure', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('totalItems', 0);
    await fixture.whenStable();
    expect(root().textContent).toContain('No financial dossiers in this scope');

    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(root().textContent).not.toContain('No financial dossiers in this scope');

    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('error', toStoreError(new Error('Directory unavailable')));
    await fixture.whenStable();
    expect(root().textContent).not.toContain('No financial dossiers in this scope');
    expect(text(root().querySelector('[role="alert"]'))).toContain(
      'Financial dossiers could not be loaded',
    );
    action('Retry directory').click();
    expect(retryCount).toBe(1);
  });
});
