import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionAttachmentOutput } from '@features/organization/features/interventions/models';
import { InterventionAttachments } from '../intervention-attachments.component';

const MAX_ATTACHMENTS = 25;

const attachment = (index: number): InterventionAttachmentOutput =>
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
  }) as InterventionAttachmentOutput;

const attachments = (count: number): readonly InterventionAttachmentOutput[] =>
  Array.from({ length: count }, (_, index) => attachment(index));

const pdf = (name: string): File => new File(['%PDF-content'], name, { type: 'application/pdf' });

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
});
