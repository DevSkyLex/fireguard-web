import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { ChecklistTable } from '../checklist-table.component';

const checklist = (overrides: Partial<ChecklistOutput> = {}): ChecklistOutput =>
  ({
    '@id': '/api/organizations/org-1/checklists/checklist-1',
    '@type': 'Checklist',
    id: 'checklist-1',
    organizationId: 'org-1',
    name: 'Fire Safety Inspection',
    version: '1.0',
    status: 'active',
    items: [
      {
        id: 'item-1',
        label: 'Check extinguishers',
        description: null,
        position: 0,
        required: true,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    ...overrides,
  }) as ChecklistOutput;

describe('ChecklistTable', () => {
  let fixture: ComponentFixture<ChecklistTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (items: readonly ChecklistOutput[], loading = false): Promise<void> => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', loading);
    await fixture.whenStable();
  };

  const openRowMenu = async (): Promise<void> => {
    root().querySelector<HTMLButtonElement>('[data-testid="checklist-table-row-menu"]')?.click();
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistTable);
  });

  it('should render one row per checklist, with its status and item count', async () => {
    await render([checklist(), checklist({ id: 'checklist-2', name: 'Fire drill' })]);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="checklist-table-row"]',
    );

    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Fire Safety Inspection');
    expect(rows[0].textContent).toContain('1');
  });

  it('should draw skeleton rows on a first load, and no data rows', async () => {
    await render([], true);

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelectorAll('[data-testid="checklist-table-row"]').length).toBe(0);
  });

  it('should keep the rows on screen while a later page loads', async () => {
    // The shared surface's loading contract is "first load only": flashing the
    // table to skeletons on page 2 loses the operator's place for nothing.
    await render([checklist()], true);

    expect(root().querySelectorAll('[data-testid="checklist-table-row"]').length).toBe(1);
    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('should mirror every row as a card, so the compact layout carries the same data', async () => {
    await render([checklist(), checklist({ id: 'checklist-2', name: 'Fire drill' })]);

    const cards: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="checklist-table-card"]',
    );

    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Fire Safety Inspection');
    expect(cards[0].textContent).toContain('items');
  });

  it('should say so plainly when a page holds no rows', async () => {
    await render([]);

    expect(root().textContent).toContain('No results.');
  });

  it('should offer no row menu without the write permission', async () => {
    fixture.componentRef.setInput('canWrite', false);
    await render([checklist()]);

    expect(root().querySelector('[data-testid="checklist-table-row-menu"]')).toBeNull();
  });

  it('should offer Edit and Archive for an active checklist, with write permission', async () => {
    fixture.componentRef.setInput('canWrite', true);
    await render([checklist({ status: 'active' })]);
    await openRowMenu();

    expect(document.querySelector('[data-testid="checklist-table-row-edit"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="checklist-table-row-archive"]')).not.toBeNull();
  });

  it('should keep archived checklists readable without write actions', async () => {
    await render([checklist({ status: 'archived' })]);
    expect(document.querySelector('[data-testid="checklist-table-row-edit"]')).toBeNull();
    expect(document.querySelector('[data-testid="checklist-table-row-archive"]')).toBeNull();
  });

  it('should emit the row checklist when Edit is chosen', async () => {
    const emitted: ChecklistOutput[] = [];
    fixture.componentInstance.editRequested.subscribe((value: ChecklistOutput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('canWrite', true);
    await render([checklist()]);
    await openRowMenu();
    document.querySelector<HTMLButtonElement>('[data-testid="checklist-table-row-edit"]')?.click();

    expect(emitted).toEqual([checklist()]);
  });

  it('should emit the row checklist when Archive is chosen', async () => {
    const emitted: ChecklistOutput[] = [];
    fixture.componentInstance.archiveRequested.subscribe((value: ChecklistOutput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('canWrite', true);
    await render([checklist({ status: 'active' })]);
    await openRowMenu();
    document
      .querySelector<HTMLButtonElement>('[data-testid="checklist-table-row-archive"]')
      ?.click();

    expect(emitted).toEqual([checklist({ status: 'active' })]);
  });

  it('should carry an accessible caption', async () => {
    await render([checklist()]);

    const caption: HTMLElement | null = root().querySelector('caption');

    expect(caption?.className).toContain('sr-only');
    expect(caption?.textContent?.trim().length).toBeGreaterThan(0);
  });
});
