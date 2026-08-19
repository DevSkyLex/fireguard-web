import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ImportJobOutput } from '@features/organization/features/imports/models';
import { ImportJobTable } from '../import-job-table.component';

const job = (overrides: Partial<ImportJobOutput> = {}): ImportJobOutput => ({
  '@id': '/api/imports/job-1',
  '@type': 'ImportJob',
  id: 'job-1',
  organization: '/api/organizations/org-1',
  kind: 'equipment',
  status: 'completed',
  originalFilename: 'equipment.csv',
  dryRun: false,
  processedRows: 50,
  successfulRows: 45,
  failedRows: 5,
  errorReport: [],
  createdAt: '2026-01-18T00:00:00+00:00',
  updatedAt: '2026-01-18T00:00:00+00:00',
  ...overrides,
});

describe('ImportJobTable', () => {
  let fixture: ComponentFixture<ImportJobTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(ImportJobTable);
  });

  it('should render one row per job with its filename, kind, status and counts', async () => {
    fixture.componentRef.setInput('items', [job()]);
    await fixture.whenStable();

    const row = byTestId('import-job-table-row');
    expect(row?.textContent).toContain('equipment.csv');
    expect(row?.textContent).toContain('Equipment');
    expect(row?.textContent).toContain('Completed');
    expect(row?.textContent).toContain('45');
    expect(row?.textContent).toContain('5');
  });

  it('should render a dry-run badge only on a dry-run job', async () => {
    fixture.componentRef.setInput('items', [job({ dryRun: true }), job({ id: 'job-2' })]);
    await fixture.whenStable();

    const rows = root().querySelectorAll('[data-testid="import-job-table-row"]');
    expect(rows[0].textContent).toContain('Dry run');
    expect(rows[1].textContent).not.toContain('Dry run');
  });

  it('should render live processed/total progress while a job is processing', async () => {
    fixture.componentRef.setInput('items', [
      job({
        status: 'processing',
        processedRows: 50,
        totalRows: 200,
        successfulRows: 0,
        failedRows: 0,
      }),
    ]);
    await fixture.whenStable();

    expect(byTestId('import-job-table-progress')?.textContent).toContain('50 / 200');
  });

  it('should render no progress line outside processing', async () => {
    fixture.componentRef.setInput('items', [job({ status: 'completed' })]);
    await fixture.whenStable();

    expect(byTestId('import-job-table-progress')).toBeNull();
  });

  it('should emit selected with the row job when View report is activated', async () => {
    const selected: ImportJobOutput[] = [];
    fixture.componentInstance.selected.subscribe((value) => selected.push(value));
    const item = job();
    fixture.componentRef.setInput('items', [item]);
    await fixture.whenStable();

    byTestId('import-job-table-view')?.click();

    expect(selected).toEqual([item]);
  });

  it('should render a no-results row when the list is empty and not loading', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', false);
    await fixture.whenStable();

    expect(root().textContent).toContain('No results.');
  });

  it('should render skeleton rows while loading with no items yet', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });
});
