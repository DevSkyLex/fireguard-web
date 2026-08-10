import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionAttachmentOutput } from '@features/organization/features/interventions/models';
import { InterventionAttachments } from '../intervention-attachments.component';

const MAX_ATTACHMENTS = 25;

const attachment = (
  index: number,
  overrides: Partial<InterventionAttachmentOutput> = {},
): InterventionAttachmentOutput =>
  ({
    '@id': `/api/intervention-attachments/${index}`,
    '@type': 'InterventionAttachment',
    id: `attachment-${index}`,
    interventionId: 'intervention-1',
    fileName: `evidence-${index}.pdf`,
    mimeType: 'application/pdf',
    size: 1024,
    label: null,
    revision: 1,
    uploadedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionAttachmentOutput;

const attachments = (count: number): readonly InterventionAttachmentOutput[] =>
  Array.from({ length: count }, (_, index) => attachment(index));

const pdf = (name: string, size = 1024): File => {
  const created: File = new File(['%PDF-content'], name, { type: 'application/pdf' });
  Object.defineProperty(created, 'size', { value: size });

  return created;
};

const image = (name: string, size = 1024): File => {
  const created: File = new File(['jpeg-bytes'], name, { type: 'image/jpeg' });
  Object.defineProperty(created, 'size', { value: size });

  return created;
};

const TEN_MEBIBYTES: number = 10 * 1024 * 1024;

describe('InterventionAttachments', () => {
  let fixture: ComponentFixture<InterventionAttachments>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (count: number, canManage = true): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionAttachments);
    fixture.componentRef.setInput('attachments', attachments(count));
    fixture.componentRef.setInput('canManage', canManage);
    await fixture.whenStable();
  };

  const pickFiles = async (files: readonly File[]): Promise<void> => {
    const input: HTMLInputElement = root().querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: { ...files, length: files.length, item: (i: number) => files[i] ?? null }, // `DataTransfer` is absent from the test DOM and `input.files` is read-only.
    });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  it('should hide the counter while the list is well below the cap', async () => {
    await create(3);

    expect(root().querySelector('[data-testid="intervention-attachments-count"]')).toBeNull();
  });

  it('should show the counter once the list is half full', async () => {
    await create(13);

    expect(
      root().querySelector('[data-testid="intervention-attachments-count"]')?.textContent,
    ).toContain(`13 / ${MAX_ATTACHMENTS}`);
  });

  it('should disable both pickers at the cap', async () => {
    await create(MAX_ATTACHMENTS);

    const add = root().querySelector<HTMLButtonElement>(
      '[data-testid="intervention-attachments-add"]',
    );
    const photo = root().querySelector<HTMLButtonElement>(
      '[data-testid="intervention-attachments-photo"]',
    );

    expect(add?.disabled).toBe(true);
    expect(photo?.disabled).toBe(true);
    expect(
      root().querySelector('[data-testid="intervention-attachments-capacity"]'),
    ).not.toBeNull();
  });

  it('should keep the pickers usable one slot below the cap', async () => {
    await create(MAX_ATTACHMENTS - 1);

    const add = root().querySelector<HTMLButtonElement>(
      '[data-testid="intervention-attachments-add"]',
    );

    expect(add?.disabled).toBe(false);
    expect(root().querySelector('[data-testid="intervention-attachments-capacity"]')).toBeNull();
  });

  it('should reject a pick that would overflow the remaining slots, whole', async () => {
    const picked: File[][] = [];
    await create(MAX_ATTACHMENTS - 2);
    fixture.componentRef.setInput('online', true);
    fixture.componentInstance.filesPicked.subscribe((files) => picked.push([...files]));

    await pickFiles([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);

    expect(picked).toEqual([]);
    expect(root().querySelector('[data-testid="intervention-attachments-error"]')).not.toBeNull();
  });

  it('should accept a pick that exactly fills the remaining slots', async () => {
    const picked: File[][] = [];
    await create(MAX_ATTACHMENTS - 2);
    fixture.componentInstance.filesPicked.subscribe((files) => picked.push([...files]));

    await pickFiles([pdf('a.pdf'), pdf('b.pdf')]);

    expect(picked.length).toBe(1);
    expect(picked[0]?.length).toBe(2);
    expect(root().querySelector('[data-testid="intervention-attachments-error"]')).toBeNull();
  });

  it('should name the ceiling itself once the intervention is already at capacity', async () => {
    await create(MAX_ATTACHMENTS);

    await pickFiles([pdf('a.pdf')]);

    expect(
      root().querySelector('[data-testid="intervention-attachments-error"]')?.textContent,
    ).toContain(`already holds the maximum of ${MAX_ATTACHMENTS} files`);
  });

  it('should reject a file outside the MIME whitelist', async () => {
    const picked: File[][] = [];
    await create(3);
    fixture.componentInstance.filesPicked.subscribe((files) => picked.push([...files]));

    await pickFiles([new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    expect(picked).toEqual([]);
    expect(
      root().querySelector('[data-testid="intervention-attachments-error"]')?.textContent,
    ).toContain('is not an accepted format (images or PDF)');
  });

  it('should accept an oversized image, since photos are compressed downstream', async () => {
    const picked: File[][] = [];
    await create(3);
    fixture.componentInstance.filesPicked.subscribe((files) => picked.push([...files]));
    const big: File = image('camera.jpg', TEN_MEBIBYTES + 1);

    await pickFiles([big]);

    expect(picked).toEqual([[big]]);
    expect(root().querySelector('[data-testid="intervention-attachments-error"]')).toBeNull();
  });

  it('should reject an oversized PDF, which is never compressed', async () => {
    const picked: File[][] = [];
    await create(3);
    fixture.componentInstance.filesPicked.subscribe((files) => picked.push([...files]));

    await pickFiles([pdf('report.pdf', TEN_MEBIBYTES + 1)]);

    expect(picked).toEqual([]);
    expect(
      root().querySelector('[data-testid="intervention-attachments-error"]')?.textContent,
    ).toContain('"report.pdf" exceeds the 10 MB limit.');
  });

  it('should clear a stale pick error on the next valid pick', async () => {
    await create(3);

    await pickFiles([new File(['x'], 'notes.txt', { type: 'text/plain' })]);
    expect(root().querySelector('[data-testid="intervention-attachments-error"]')).not.toBeNull();

    await pickFiles([pdf('good.pdf')]);

    expect(root().querySelector('[data-testid="intervention-attachments-error"]')).toBeNull();
  });

  it('should render nothing for a reader who cannot manage attachments', async () => {
    await create(3, false);

    expect(root().querySelector('[data-testid="intervention-attachments-add"]')).toBeNull();
  });

  it('should disable the pickers while offline', async () => {
    await create(3);
    fixture.componentRef.setInput('online', false);
    await fixture.whenStable();

    const add = root().querySelector<HTMLButtonElement>(
      '[data-testid="intervention-attachments-add"]',
    );

    expect(add?.disabled).toBe(true);
  });

  it('should disable the pickers while an upload is in flight', async () => {
    await create(3);
    fixture.componentRef.setInput('uploading', true);
    await fixture.whenStable();

    const add = root().querySelector<HTMLButtonElement>(
      '[data-testid="intervention-attachments-add"]',
    );

    expect(add?.disabled).toBe(true);
  });

  it('should lock only the row whose own delete is in flight', async () => {
    await create(2);
    fixture.componentRef.setInput('pendingIds', new Set(['attachment-0']));
    await fixture.whenStable();

    const rows: HTMLElement[] = Array.from(
      root().querySelectorAll('[data-testid="intervention-attachment-row"]'),
    );

    expect(rows[0]?.querySelector('hlm-spinner')).not.toBeNull();
    expect(rows[0]?.querySelector('[data-testid="intervention-attachment-delete"]')).toBeNull();
    expect(rows[1]?.querySelector('[data-testid="intervention-attachment-delete"]')).not.toBeNull();
  });

  it('should emit a delete only once the confirmation is accepted', async () => {
    const deletions: InterventionAttachmentOutput[] = [];
    await create(1);
    fixture.componentInstance.deleteRequested.subscribe((target) => deletions.push(target));

    (
      root().querySelector('[data-testid="intervention-attachment-delete"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(deletions).toEqual([]);

    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-attachment-delete-confirm"]')
      ?.click();

    expect(deletions).toEqual([attachment(0)]);
  });

  it('should not delete anything when the confirmation is dismissed', async () => {
    const deletions: InterventionAttachmentOutput[] = [];
    await create(1);
    fixture.componentInstance.deleteRequested.subscribe((target) => deletions.push(target));

    (
      root().querySelector('[data-testid="intervention-attachment-delete"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="intervention-attachment-delete-dialog"] button',
      )
      ?.click();

    expect(deletions).toEqual([]);
  });

  it('should invite the manager to add the first file when the list is empty', async () => {
    await create(0);

    expect(
      root().querySelector('[data-testid="intervention-attachments-empty"]')?.textContent,
    ).toContain('Add photos or documents to keep with this intervention.');
  });

  it('should tell a read-only viewer that nothing has been attached, without inviting a pick', async () => {
    await create(0, false);

    expect(
      root().querySelector('[data-testid="intervention-attachments-empty"]')?.textContent,
    ).toContain('No one has attached a file to this intervention yet.');
  });
});
