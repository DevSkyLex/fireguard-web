import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ImportUploadForm } from '../import-upload-form.component';
import type { ImportUploadSubmission } from '../models/import-upload-submission.interface';

describe('ImportUploadForm', () => {
  let fixture: ComponentFixture<ImportUploadForm>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  const pickFile = async (file: File): Promise<void> => {
    const input = root().querySelector<HTMLInputElement>(
      '[data-testid="import-upload-file-input"]',
    );
    expect(input).not.toBeNull();
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) },
    });
    input?.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const chooseKind = async (value: 'equipment' | 'facility'): Promise<void> => {
    fixture.componentInstance['model'].set({
      ...fixture.componentInstance['model'](),
      kind: value,
    });
    await fixture.whenStable();
  };

  const submitForm = (): void => {
    root().querySelector<HTMLFormElement>('form')?.requestSubmit();
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ImportUploadForm);
    await fixture.whenStable();
  });

  it('should reject a picked file without a .csv extension', async () => {
    await pickFile(new File(['data'], 'notes.txt', { type: 'text/plain' }));

    expect(byTestId('import-upload-file-error')?.textContent).toContain('.csv');
  });

  it('should reject a picked file larger than 5 MB', async () => {
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'equipment.csv', {
      type: 'text/csv',
    });

    await pickFile(oversized);

    expect(byTestId('import-upload-file-error')?.textContent).toContain('5 MB');
  });

  it('should accept a valid .csv file within the size limit', async () => {
    await pickFile(new File(['a,b\n1,2'], 'equipment.csv', { type: 'text/csv' }));

    expect(byTestId('import-upload-file-error')).toBeNull();
    expect(root().textContent).toContain('equipment.csv');
  });

  it('should not submit without a chosen kind, and should show its field error', async () => {
    const submitted: ImportUploadSubmission[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    await pickFile(new File(['a,b'], 'equipment.csv', { type: 'text/csv' }));

    submitForm();
    await fixture.whenStable();

    expect(submitted.length).toBe(0);
    expect(root().textContent).toContain('Choose what the file imports.');
  });

  it('should not submit without a chosen file, and should show the file-required error', async () => {
    const submitted: ImportUploadSubmission[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    await chooseKind('equipment');

    submitForm();
    await fixture.whenStable();

    expect(submitted.length).toBe(0);
    expect(byTestId('import-upload-file-error')?.textContent).toContain(
      'Choose a CSV file to upload.',
    );
  });

  it('should emit the kind, file and dry-run choice once both are valid', async () => {
    const submitted: ImportUploadSubmission[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    const file = new File(['a,b'], 'equipment.csv', { type: 'text/csv' });
    await chooseKind('equipment');
    await pickFile(file);

    submitForm();
    await fixture.whenStable();

    expect(submitted).toEqual([{ kind: 'equipment', file, dryRun: false }]);
  });

  it('should reset the picked file after a successful submission', async () => {
    const file = new File(['a,b'], 'equipment.csv', { type: 'text/csv' });
    await chooseKind('equipment');
    await pickFile(file);

    submitForm();
    await fixture.whenStable();

    expect(root().textContent).toContain('equipment.csv');
    fixture.componentRef.setInput('error', 'Upload failed');
    await fixture.whenStable();
    expect(root().textContent).toContain('equipment.csv');
    fixture.componentRef.setInput('acceptedJobId', 'job-accepted');
    await fixture.whenStable();
    expect(root().textContent).not.toContain('equipment.csv');
  });

  it('should render the server-side error message when given one', async () => {
    fixture.componentRef.setInput('error', 'The file could not be processed.');
    await fixture.whenStable();

    expect(byTestId('import-upload-error')?.textContent).toContain(
      'The file could not be processed.',
    );
  });

  it('should disable submit while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      root().querySelector<HTMLButtonElement>('[data-testid="import-upload-submit"]')?.disabled,
    ).toBe(true);
  });
});
