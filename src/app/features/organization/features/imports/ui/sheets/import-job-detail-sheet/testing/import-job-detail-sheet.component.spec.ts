import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  ImportJobOutput,
  ImportRowErrorOutput,
} from '@features/organization/features/imports/models';
import { ImportJobDetailSheet } from '../import-job-detail-sheet.component';

const row = (overrides: Partial<ImportRowErrorOutput> = {}): ImportRowErrorOutput => ({
  rowNumber: 2,
  column: 'type',
  code: 'invalid',
  message: 'Unknown equipment type.',
  ...overrides,
});

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
  successfulRows: 38,
  failedRows: 12,
  errorReport: [],
  createdAt: '2026-01-18T00:00:00+00:00',
  updatedAt: '2026-01-18T00:00:00+00:00',
  ...overrides,
});

const byTestId = (id: string): HTMLElement | null =>
  document.body.querySelector(`[data-testid="${id}"]`);

describe('ImportJobDetailSheet', () => {
  let fixture: ComponentFixture<ImportJobDetailSheet>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(ImportJobDetailSheet);
    fixture.componentRef.setInput('visible', true);
  });

  it('should state the queued copy while the job has not started processing', async () => {
    fixture.componentRef.setInput(
      'job',
      job({ status: 'pending', successfulRows: 0, failedRows: 0 }),
    );
    await fixture.whenStable();

    expect(byTestId('import-job-detail-summary')).toBeNull();
    expect(
      document.body.querySelector('[data-testid="import-job-detail-sheet"]')?.textContent,
    ).toContain('Queued');
  });

  it('should state the partial-application summary naming the quota reason', async () => {
    fixture.componentRef.setInput(
      'job',
      job({
        errorReport: [row({ code: 'quota_exceeded', message: 'Plan limit reached.' })],
      }),
    );
    await fixture.whenStable();

    const summary: string | null | undefined = byTestId('import-job-detail-summary')?.textContent;
    expect(summary).toContain('38');
    expect(summary).toContain('50');
    expect(summary).toContain('12');
    expect(summary).toContain('plan limit reached');
  });

  it('should state a plain issues summary when no row was quota-limited', async () => {
    fixture.componentRef.setInput('job', job({ errorReport: [row({ code: 'invalid' })] }));
    await fixture.whenStable();

    expect(byTestId('import-job-detail-summary')?.textContent).toContain('see the list below');
  });

  it('should state every row created with no partial-application copy when nothing failed', async () => {
    fixture.componentRef.setInput('job', job({ successfulRows: 50, failedRows: 0 }));
    await fixture.whenStable();

    const summary: string | null | undefined = byTestId('import-job-detail-summary')?.textContent;
    expect(summary).toContain('50');
    expect(summary).not.toContain('skipped');
  });

  it('should state that no data was written on a dry run', async () => {
    fixture.componentRef.setInput(
      'job',
      job({ dryRun: true, successfulRows: 40, failedRows: 10, status: 'completed' }),
    );
    await fixture.whenStable();

    expect(byTestId('import-job-detail-summary')?.textContent).toContain('no data was written');
  });

  it('should render would_create as a positive outcome, never as a failure', async () => {
    fixture.componentRef.setInput(
      'job',
      job({
        dryRun: true,
        errorReport: [row({ code: 'would_create', message: 'Row is valid.' })],
      }),
    );
    await fixture.whenStable();

    const rows: HTMLElement | null = byTestId('import-job-detail-rows');
    expect(rows?.textContent).toContain('Would create');
    expect(rows?.querySelector('.text-success')).not.toBeNull();
  });

  it('should render each report row with its row number, column and message', async () => {
    fixture.componentRef.setInput(
      'job',
      job({ errorReport: [row({ rowNumber: 7, column: 'serialNumber', message: 'Duplicate.' })] }),
    );
    await fixture.whenStable();

    const rowsText: string | null | undefined = byTestId('import-job-detail-rows')?.textContent;
    expect(rowsText).toContain('7');
    expect(rowsText).toContain('serialNumber');
    expect(rowsText).toContain('Duplicate.');
  });

  it('should render no column segment for a row-level failure with a null column', async () => {
    fixture.componentRef.setInput(
      'job',
      job({ errorReport: [row({ column: null, message: 'Row could not be parsed.' })] }),
    );
    await fixture.whenStable();

    expect(byTestId('import-job-detail-rows')?.textContent).toContain('Row could not be parsed.');
  });
});
