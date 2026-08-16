import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityTable } from '../facility-table.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    '@id': '/api/facilities/facility-1',
    '@type': 'Facility',
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'Headquarters',
    code: 'HQ-01',
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

describe('FacilityTable', () => {
  let fixture: ComponentFixture<FacilityTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (items: readonly FacilityOutput[], loading = false): Promise<void> => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'facilities']);
    fixture.componentRef.setInput('sortOrder', { field: 'name', direction: 'asc' });
    await fixture.whenStable();
  };

  const openRowMenu = async (): Promise<void> => {
    root().querySelector<HTMLButtonElement>('[data-testid="facility-table-row-menu"]')?.click();
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(FacilityTable);
  });

  it('should render one row per facility, humanizing the raw type', async () => {
    await render([facility(), facility({ id: 'facility-2', type: 'floor' })]);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="facility-table-row"]',
    );

    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Building');
    expect(rows[1].textContent).toContain('Floor');
  });

  it('should link the name cell to the facility record', async () => {
    await render([facility()]);

    const link: HTMLAnchorElement | null = root().querySelector('a');

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/facilities/facility-1');
  });

  it('should mark a facility with sub-facilities, and no other', async () => {
    await render([facility({ hasChildren: true }), facility({ id: 'facility-2' })]);

    const rows: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="facility-table-row"]'),
    ];

    expect(rows[0].querySelector('[aria-label="Has sub-facilities"]')).not.toBeNull();
    expect(rows[1].querySelector('[aria-label="Has sub-facilities"]')).toBeNull();
  });

  it('should draw skeleton rows while loading with nothing loaded yet', async () => {
    await render([], true);

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelectorAll('[data-testid="facility-table-row"]').length).toBe(0);
  });

  it('should keep the rows already on screen rather than swap them for skeletons on a refetch', async () => {
    await render([facility()], true);

    expect(root().querySelectorAll('[data-testid="facility-table-row"]').length).toBe(1);
    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('should say so plainly when a page holds no rows', async () => {
    await render([]);

    expect(root().querySelector('[data-testid="facility-table-row"]')).toBeNull();
    expect(root().textContent).toContain('No results.');
  });

  it('should always offer Open in the row menu', async () => {
    await render([facility()]);
    await openRowMenu();

    const openLink: HTMLAnchorElement | null = document.body.querySelector(
      'hlm-dropdown-menu a[href="/organizations/org-1/facilities/facility-1"]',
    );

    expect(openLink).not.toBeNull();
  });

  it('should offer neither Archive nor Restore without the write permission', async () => {
    fixture.componentRef.setInput('canWrite', false);
    await render([facility({ status: 'active' })]);
    await openRowMenu();

    expect(document.querySelector('[data-testid="facility-table-row-archive"]')).toBeNull();
    expect(document.querySelector('[data-testid="facility-table-row-restore"]')).toBeNull();
  });

  it('should offer Archive for an active facility, and not Restore', async () => {
    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ status: 'active' })]);
    await openRowMenu();

    expect(document.querySelector('[data-testid="facility-table-row-archive"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="facility-table-row-restore"]')).toBeNull();
  });

  it('should offer Restore for an archived facility, and not Archive', async () => {
    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ status: 'archived' })]);
    await openRowMenu();

    expect(document.querySelector('[data-testid="facility-table-row-restore"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="facility-table-row-archive"]')).toBeNull();
  });

  it('should emit the row facility when Archive is chosen', async () => {
    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.archiveRequested.subscribe((value: FacilityOutput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ id: 'facility-9', status: 'active' })]);
    await openRowMenu();
    document
      .querySelector<HTMLButtonElement>('[data-testid="facility-table-row-archive"]')
      ?.click();

    expect(emitted).toEqual([facility({ id: 'facility-9', status: 'active' })]);
  });

  it('should emit the row facility when Restore is chosen', async () => {
    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.restoreRequested.subscribe((value: FacilityOutput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ id: 'facility-9', status: 'archived' })]);
    await openRowMenu();
    document
      .querySelector<HTMLButtonElement>('[data-testid="facility-table-row-restore"]')
      ?.click();

    expect(emitted).toEqual([facility({ id: 'facility-9', status: 'archived' })]);
  });

  it('should mark the active sort field with aria-sort and hide it from the rest', async () => {
    await render([facility()]);
    fixture.componentRef.setInput('sortOrder', { field: 'code', direction: 'desc' });
    await fixture.whenStable();

    const heads: HTMLElement[] = [...root().querySelectorAll<HTMLElement>('th[aria-sort]')];
    const codeHead = heads.find((head) =>
      head.querySelector('[data-testid="facility-table-sort-code"]'),
    );
    const nameHead = heads.find((head) =>
      head.querySelector('[data-testid="facility-table-sort-name"]'),
    );

    expect(codeHead?.getAttribute('aria-sort')).toBe('descending');
    expect(nameHead?.getAttribute('aria-sort')).toBe('none');
  });

  it('should emit the field when a sortable head is activated', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.sortChanged.subscribe((field: string): void => {
      emitted.push(field);
    });

    await render([facility()]);
    root().querySelector<HTMLButtonElement>('[data-testid="facility-table-sort-status"]')?.click();

    expect(emitted).toEqual(['status']);
  });

  it('should carry an accessible caption', async () => {
    await render([facility()]);

    const caption: HTMLElement | null = root().querySelector('caption');

    expect(caption?.className).toContain('sr-only');
    expect(caption?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('should name the scrolling region from the table caption', async () => {
    await render([facility()]);

    const region: HTMLElement | null = root().querySelector('[role="region"]');
    const caption: HTMLElement | null = root().querySelector('caption');

    expect(region?.getAttribute('aria-labelledby')).toBe(caption?.id);
    expect(caption?.id).toBeTruthy();
  });
});
