import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { EquipmentAttachmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentAttachments } from '../equipment-attachments.component';

const attachment = (
  index: number,
  overrides: Partial<EquipmentAttachmentOutput> = {},
): EquipmentAttachmentOutput =>
  ({
    '@id': `/api/organizations/org-1/equipment/equipment-1/attachments/${index}`,
    '@type': 'EquipmentAttachment',
    id: `attachment-${index}`,
    revision: 1,
    equipmentId: 'equipment-1',
    fileName: `datasheet-${index}.pdf`,
    mimeType: 'application/pdf',
    size: 1024,
    label: null,
    uploadedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as EquipmentAttachmentOutput;

describe('EquipmentAttachments', () => {
  let fixture: ComponentFixture<EquipmentAttachments>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (
    attachments: readonly EquipmentAttachmentOutput[],
    canManage = true,
  ): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(EquipmentAttachments);
    fixture.componentRef.setInput('attachments', attachments);
    fixture.componentRef.setInput('canManage', canManage);
    await fixture.whenStable();
  };

  it('should show the empty state when there are no attachments', async () => {
    await create([]);

    expect(root().querySelector('[data-testid="equipment-attachments-empty"]')).not.toBeNull();
  });

  it('should render one row per attachment', async () => {
    await create([attachment(1), attachment(2)]);

    expect(root().querySelectorAll('[data-testid="equipment-attachment-row"]').length).toBe(2);
  });

  it('should hide the add and delete actions when not manageable', async () => {
    await create([attachment(1)], false);

    expect(root().querySelector('[data-testid="equipment-attachments-add"]')).toBeNull();
    expect(root().querySelector('[data-testid="equipment-attachment-delete"]')).toBeNull();
  });

  it('should emit filesPicked with the selected files, then reset the input', async () => {
    await create([]);

    const emitted: File[][] = [];
    fixture.componentInstance.filesPicked.subscribe((files) => emitted.push([...files]));

    const file: File = new File(['%PDF'], 'manual.pdf', { type: 'application/pdf' });
    const input: HTMLInputElement = root().querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) },
    });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(emitted).toEqual([[file]]);
    expect(input.value).toBe('');
  });

  it('should emit downloadRequested for the clicked row', async () => {
    await create([attachment(1)]);

    const emitted: EquipmentAttachmentOutput[] = [];
    fixture.componentInstance.downloadRequested.subscribe((value) => emitted.push(value));

    root()
      .querySelector<HTMLButtonElement>('[data-testid="equipment-attachment-download"]')
      ?.dispatchEvent(new MouseEvent('click'));

    expect(emitted).toEqual([attachment(1)]);
  });

  it('should emit deleteRequested for the clicked row', async () => {
    await create([attachment(1)]);

    const emitted: EquipmentAttachmentOutput[] = [];
    fixture.componentInstance.deleteRequested.subscribe((value) => emitted.push(value));

    root()
      .querySelector<HTMLButtonElement>('[data-testid="equipment-attachment-delete"]')
      ?.dispatchEvent(new MouseEvent('click'));

    expect(emitted).toEqual([attachment(1)]);
  });

  it('should lock the row download button while its id is downloading', async () => {
    await create([attachment(1)]);
    fixture.componentRef.setInput('downloadingIds', new Set(['attachment-1']));
    await fixture.whenStable();

    expect(
      root().querySelector<HTMLButtonElement>('[data-testid="equipment-attachment-download"]')
        ?.disabled,
    ).toBe(true);
  });
});
