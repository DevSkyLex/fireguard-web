import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type {
  MaintenanceEconomicAmount,
  MaintenanceEconomicRow,
} from '@features/organization/features/maintenance-costs/models';
import { MaintenanceReportTable } from '../maintenance-report-table.component';

class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

function amount(total = '0.000000'): MaintenanceEconomicAmount {
  return {
    total,
    knownTotal: total,
    complete: true,
    contributionCount: 1,
    unknownCount: 0,
  };
}

function row(overrides: Partial<MaintenanceEconomicRow> = {}): MaintenanceEconomicRow {
  return {
    id: '436c3a9d-a3a4-4bd5-81f3-1b291eef6197',
    name: 'Extinguisher reception desk',
    identityState: 'captured',
    allocationComplete: true,
    current: amount('120.000000'),
    frozen: amount('115.000000'),
    planned: amount('100.000000'),
    budget: amount('150.000000'),
    variance: '20.000000',
    interventionIds: ['6836d082-7860-4791-9282-ff075c7b5427'],
    ...overrides,
  };
}

function text(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('MaintenanceReportTable', () => {
  let fixture: ComponentFixture<MaintenanceReportTable>;
  let dossierRequests: MaintenanceEconomicRow[];
  let pageRequests: number[];
  let pageSizeRequests: number[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const cardMetric = (label: string, index = 0): HTMLElement => {
    const card = root().querySelectorAll('[data-testid="maintenance-report-cards"] li')[index];
    const term = Array.from(card?.querySelectorAll('dt') ?? []).find(
      (element) => text(element) === label,
    );
    const container = term?.parentElement;
    if (!container) throw new Error('Missing card metric ' + label);
    return container;
  };
  const gridCells = (index = 0): HTMLTableCellElement[] => {
    const rows = root().querySelectorAll('[data-testid="maintenance-report-grid"] tbody tr');
    return Array.from(rows[index]?.querySelectorAll<HTMLTableCellElement>('td') ?? []);
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'en-US' },
      ],
    });
    fixture = TestBed.createComponent(MaintenanceReportTable);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.componentRef.setInput('rows', [row()]);
    fixture.componentRef.setInput('totalItems', 1);
    dossierRequests = [];
    pageRequests = [];
    pageSizeRequests = [];
    fixture.componentInstance.dossiersRequested.subscribe((value) => dossierRequests.push(value));
    fixture.componentInstance.pageChanged.subscribe((value) => pageRequests.push(value));
    fixture.componentInstance.pageSizeChanged.subscribe((value) => pageSizeRequests.push(value));
    await fixture.whenStable();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('preserves every digit of a large exact amount in both table and card presentations', async () => {
    fixture.componentRef.setInput('rows', [row({ current: amount('9007199254740993.123456') })]);
    await fixture.whenStable();

    expect(text(cardMetric('Current realized cost').querySelector('dd'))).toBe(
      '9,007,199,254,740,993.123456 EUR',
    );
    expect(text(gridCells()[1])).toBe('9,007,199,254,740,993.123456 EUR');
    expect(root().textContent).not.toContain('9,007,199,254,740,992');
  });

  it('keeps an incomplete total unknown while displaying its zero known subtotal and unknown count', async () => {
    const incomplete: MaintenanceEconomicAmount = {
      knownTotal: '0.000000',
      complete: false,
      contributionCount: 3,
      unknownCount: 3,
    };
    fixture.componentRef.setInput('rows', [row({ current: incomplete, frozen: amount() })]);
    await fixture.whenStable();

    const current = cardMetric('Current realized cost');
    expect(text(current.querySelector('dd'))).toBe('Unknown');
    expect(Array.from(current.querySelectorAll('dd:nth-of-type(2) > span'), text)).toEqual([
      'Known subtotal',
      '0.000000 EUR',
      'Unvalued contributions: 3',
    ]);
    expect(Array.from(gridCells()[1].querySelectorAll(':scope > div > span'), text)).toEqual([
      'Unknown',
      'Known subtotal',
      '0.000000 EUR',
      'Unvalued contributions: 3',
    ]);
    expect(text(cardMetric('Cost at closure').querySelector('dd'))).toBe('0.000000 EUR');
    expect(text(gridCells()[2])).toBe('0.000000 EUR');
  });

  it('does not present a positive known subtotal as a completed realized total', async () => {
    fixture.componentRef.setInput('rows', [
      row({
        current: {
          total: '42.000000',
          knownTotal: '42.000000',
          complete: false,
          contributionCount: 4,
          unknownCount: 1,
        },
      }),
    ]);
    await fixture.whenStable();

    expect(text(cardMetric('Current realized cost').querySelector('dd'))).toBe('Unknown');
    expect(Array.from(gridCells()[1].querySelectorAll(':scope > div > span'), text)).toEqual([
      'Unknown',
      'Known subtotal',
      '42.000000 EUR',
      'Unvalued contributions: 1',
    ]);
  });

  it('shows the forecast and budget separately without summing them into realized costs', () => {
    const headers = Array.from(root().querySelectorAll('thead th'), text);
    expect(headers).toEqual([
      'Allocation',
      'Current realized cost',
      'Cost at closure',
      'Forecast cost',
      'Budget',
      'Realized minus forecast',
      'Source dossiers',
    ]);
    expect(text(gridCells()[1])).toBe('120.000000 EUR');
    expect(text(gridCells()[3])).toBe('100.000000 EUR');
    expect(text(gridCells()[4])).toBe('150.000000 EUR');
    expect(text(cardMetric('Forecast cost').querySelector('dd'))).toBe('100.000000 EUR');
    expect(text(cardMetric('Budget').querySelector('dd'))).toBe('150.000000 EUR');
  });

  it.each([
    ['-0.000001', '−0.000001 EUR'],
    ['20.000000', '20.000000 EUR'],
    [null, 'Unknown'],
  ])('renders the exact signed or unknown variance %s', async (variance, expected) => {
    fixture.componentRef.setInput('rows', [row({ variance })]);
    await fixture.whenStable();

    expect(text(cardMetric('Realized minus forecast').querySelector('dd'))).toBe(expected);
    expect(text(gridCells()[5])).toBe(expected);
  });

  it('names unallocated and missing historical identities explicitly without exposing raw ids', async () => {
    const historical = row({ name: '   ', identityState: 'incomplete', allocationComplete: false });
    const unallocated = row({
      id: null,
      name: null,
      identityState: 'unallocated',
      allocationComplete: false,
    });
    fixture.componentRef.setInput('rows', [historical, unallocated]);
    fixture.componentRef.setInput('showPagination', false);
    await fixture.whenStable();

    expect(Array.from(gridCells(0)[0].querySelectorAll(':scope > div > span'), text)).toEqual([
      'Historical identity unavailable',
      'Identity is incomplete',
      'Allocation incomplete',
    ]);
    expect(Array.from(gridCells(1)[0].querySelectorAll(':scope > div > span'), text)).toEqual([
      'Unallocated costs',
      'No allocation identity',
      'Allocation incomplete',
    ]);
    expect(Array.from(root().querySelectorAll('h3'), text)).toEqual([
      'Historical identity unavailable',
      'Unallocated costs',
    ]);
    expect(root().textContent).not.toContain(historical.id);
    expect(root().textContent).not.toContain(historical.interventionIds[0]);
    expect(root().querySelector('app-collection-pagination')).toBeNull();
  });

  it('keeps closure identity provenance and names both responsive presentations accessibly', async () => {
    fixture.componentRef.setInput('caption', 'Recorded site allocations — January 2026');
    await fixture.whenStable();

    expect(Array.from(gridCells()[0].querySelectorAll(':scope > div > span'), text)).toEqual([
      'Extinguisher reception desk',
      'Identity recorded at closure',
    ]);
    expect(text(root().querySelector('caption'))).toBe('Recorded site allocations — January 2026');
    expect(
      root().querySelector('[data-testid="maintenance-report-cards"]')?.getAttribute('aria-label'),
    ).toBe('Recorded site allocations — January 2026');
  });

  it.each(['maintenance-report-cards', 'maintenance-report-grid'])(
    'emits the complete selected allocation from the %s source action',
    async (presentation) => {
      const selected = row();
      fixture.componentRef.setInput('rows', [selected]);
      await fixture.whenStable();

      root().querySelector<HTMLButtonElement>(`[data-testid="${presentation}"] button`)?.click();

      expect(dossierRequests).toEqual([selected]);
      expect(dossierRequests[0]).toBe(selected);
    },
  );

  it('disables source actions when there are no source dossiers', async () => {
    fixture.componentRef.setInput('rows', [row({ interventionIds: [] })]);
    await fixture.whenStable();

    const actions = Array.from(
      root().querySelectorAll<HTMLButtonElement>(
        '[data-testid="maintenance-report-cards"] button, [data-testid="maintenance-report-grid"] button',
      ),
    );
    expect(actions).toHaveLength(2);
    expect(actions.map((action) => action.disabled)).toEqual([true, true]);
    actions.forEach((action) => action.click());
    expect(dossierRequests).toEqual([]);
  });

  it('uses the full server destination count and forwards page and page-size intent', async () => {
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('itemsPerPage', 25);
    fixture.componentRef.setInput('totalItems', 101);
    await fixture.whenStable();

    expect(text(root().querySelector('[data-testid="maintenance-report-row-count"]'))).toBe(
      '1 of 101 rows shown',
    );
    expect(text(root().querySelector('[data-testid="maintenance-report-page-indicator"]'))).toBe(
      'Page 2 of 5',
    );
    root()
      .querySelector<HTMLButtonElement>('[data-testid="maintenance-report-page-last"]')
      ?.click();
    fixture.debugElement.query(By.css('hlm-select')).triggerEventHandler('valueChange', 60);

    expect(pageRequests).toEqual([5]);
    expect(pageSizeRequests).toEqual([60]);
    expect(fixture.componentInstance.page()).toBe(2);
    expect(fixture.componentInstance.itemsPerPage()).toBe(25);
    expect(fixture.componentInstance.rows()).toHaveLength(1);
  });

  it('retains prior rows during a pending replacement read and blocks source actions', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="maintenance-report-table"]')?.getAttribute('aria-busy'),
    ).toBe('true');
    expect(text(root().querySelector('[role="status"]'))).toBe('Reading economic allocations');
    expect(text(gridCells()[0])).toContain('Extinguisher reception desk');
    expect(text(cardMetric('Current realized cost').querySelector('dd'))).toBe('120.000000 EUR');
    const actions = Array.from(
      root().querySelectorAll<HTMLButtonElement>(
        '[data-testid="maintenance-report-cards"] button, [data-testid="maintenance-report-grid"] button',
      ),
    );
    expect(actions.map((action) => action.disabled)).toEqual([true, true]);
    actions.forEach((action) => action.click());
    expect(dossierRequests).toEqual([]);
    expect(root().textContent).not.toContain('No costs allocated in this window');
  });

  it('distinguishes an empty completed window from a pending initial read', async () => {
    fixture.componentRef.setInput('rows', []);
    await fixture.whenStable();
    expect(root().textContent).toContain('No costs allocated in this window');

    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(root().textContent).not.toContain('No costs allocated in this window');
    expect(text(root().querySelector('[role="status"]'))).toBe('Reading economic allocations');
  });
});
