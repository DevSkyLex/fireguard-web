import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionTable } from '../inspection-table.component';

const inspection = (overrides: Partial<InspectionOutput> = {}): InspectionOutput =>
  ({
    '@id': '/api/organizations/org-1/inspections/inspection-1',
    '@type': 'Inspection',
    id: 'inspection-1',
    organizationId: 'org-1',
    equipmentId: 'equipment-1',
    facilityId: null,
    result: 'pass',
    status: 'draft',
    performedAt: '2026-08-10T00:00:00Z',
    inspector: {
      type: 'user',
      id: 'member-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      avatarUrl: null,
      organizationName: null,
    },
    checklistId: null,
    notes: null,
    signature: null,
    nonConformitiesCount: 0,
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
    ...overrides,
  }) as InspectionOutput;

describe('InspectionTable', () => {
  let fixture: ComponentFixture<InspectionTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (items: readonly InspectionOutput[], loading = false): Promise<void> => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'inspections']);
    fixture.componentRef.setInput('sortOrder', { field: 'performedAt', direction: 'desc' });
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InspectionTable);
  });

  it('should render one row per inspection, naming the inspector and the result', async () => {
    await render([
      inspection(),
      inspection({ id: 'inspection-2', result: 'fail', status: 'submitted' }),
    ]);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="inspection-table-row"]',
    );

    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Ada Lovelace');
    expect(rows[0].textContent).toContain('Pass');
    expect(rows[1].textContent).toContain('Fail');
  });

  it('should link the date cell to the inspection record', async () => {
    await render([inspection()]);

    const link: HTMLAnchorElement | null = root().querySelector('a');

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/inspections/inspection-1');
  });

  it('should show a fallback when an inspection has no inspector', async () => {
    await render([inspection({ inspector: null })]);

    expect(root().textContent).toContain('Not specified');
  });

  it('should show the non-conformities count', async () => {
    await render([inspection({ nonConformitiesCount: 3 })]);

    const row: HTMLElement | null = root().querySelector('[data-testid="inspection-table-row"]');

    expect(row?.textContent).toContain('3');
  });

  it('should draw skeleton rows while loading with nothing loaded yet', async () => {
    await render([], true);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll('tbody tr');

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelectorAll('[data-testid="inspection-table-row"]').length).toBe(0);
    expect(
      [...rows].every((row: HTMLElement): boolean => row.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
  });

  it('should say so plainly when there is nothing to show', async () => {
    await render([], false);

    expect(root().textContent).toContain('No results.');
  });

  it('should name the scrolling region from the table caption', async () => {
    await render([inspection()]);

    const region: HTMLElement | null = root().querySelector('[role="region"]');
    const caption: HTMLElement | null = root().querySelector('caption');

    expect(region?.getAttribute('aria-labelledby')).toBe(caption?.id);
    expect(caption?.id).toBeTruthy();
  });

  it('should announce the active ordering on its head and none on the others', async () => {
    await render([inspection()]);

    const performedAtHead: HTMLElement | null = root().querySelector(
      '[data-testid="inspection-table-sort-performed-at"]',
    )?.parentElement as HTMLElement | null;
    const resultHead: HTMLElement | null = root().querySelector(
      '[data-testid="inspection-table-sort-result"]',
    )?.parentElement as HTMLElement | null;

    expect(performedAtHead?.getAttribute('aria-sort')).toBe('descending');
    expect(resultHead?.getAttribute('aria-sort')).toBe('none');
  });

  it('should emit sortChanged with the field when a sortable head is activated', async () => {
    await render([inspection()]);
    const emitted: string[] = [];
    fixture.componentInstance.sortChanged.subscribe((field: string) => emitted.push(field));

    (
      root().querySelector('[data-testid="inspection-table-sort-result"]') as HTMLButtonElement
    ).click();

    expect(emitted).toEqual(['result']);
  });
});
