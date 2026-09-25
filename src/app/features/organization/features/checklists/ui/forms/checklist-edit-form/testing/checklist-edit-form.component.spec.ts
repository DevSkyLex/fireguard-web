import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  ChecklistOutput,
  UpdateChecklistInput,
} from '@features/organization/features/checklists/models';
import { ChecklistEditForm } from '../checklist-edit-form.component';

const checklist = (overrides: Partial<ChecklistOutput> = {}): ChecklistOutput =>
  ({
    '@id': '/api/organizations/org-1/checklists/checklist-1',
    '@type': 'Checklist',
    id: 'checklist-1',
    organizationId: 'org-1',
    name: 'Electrical audit',
    version: '1.0',
    status: 'active',
    items: [
      { id: 'item-1', label: 'Check panel', description: null, position: 0, required: true },
      {
        id: 'item-2',
        label: 'Check breakers',
        description: 'Visual check',
        position: 1,
        required: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as ChecklistOutput;

describe('ChecklistEditForm', () => {
  let fixture: ComponentFixture<ChecklistEditForm>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const requiredElement = <T extends HTMLElement>(selector: string): T => {
    const element = root().querySelector<T>(selector);
    if (element === null) throw new Error(`Missing ${selector}`);
    return element;
  };

  const render = async (value: ChecklistOutput): Promise<void> => {
    fixture.componentRef.setInput('checklist', value);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistEditForm);
  });

  it('should seed the name and items from the checklist, in position order', async () => {
    await render(checklist());

    expect(root().querySelector<HTMLInputElement>('#checklist-edit-name')?.value).toBe(
      'Electrical audit',
    );
    const rows: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="checklist-edit-items"] li'),
    ];
    expect(rows[0].querySelector('input')?.value).toBe('Check panel');
    expect(rows[1].querySelector('input')?.value).toBe('Check breakers');
    expect(rows[1].textContent).toContain('Optional');
  });

  it('emits only changed metadata and preserves the item identities', async () => {
    const emitted: UpdateChecklistInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: UpdateChecklistInput): void => {
      emitted.push(value);
    });

    await render(checklist());

    const nameInput = root().querySelector<HTMLInputElement>('#checklist-edit-name');
    if (nameInput === null) throw new Error('missing name input');
    nameInput.value = 'Electrical audit v2';
    nameInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    root().querySelector<HTMLButtonElement>('[data-testid="checklist-edit-submit"]')?.click();
    await fixture.whenStable();

    expect(emitted).toEqual([{ name: 'Electrical audit v2' }]);
  });

  it('should remove a seeded item before submission', async () => {
    await render(checklist());

    root()
      .querySelector<HTMLButtonElement>('[data-testid="checklist-edit-item-remove-0"]')
      ?.click();
    await fixture.whenStable();

    const rows: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="checklist-edit-items"] li'),
    ];
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('input')?.value).toBe('Check breakers');
  });

  it('should reseed from a different checklist on the next open', async () => {
    await render(checklist({ id: 'checklist-1', name: 'First' }));

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    await render(checklist({ id: 'checklist-2', name: 'Second', items: [] }));

    expect(root().querySelector<HTMLInputElement>('#checklist-edit-name')?.value).toBe('Second');
    expect(root().querySelector('[data-testid="checklist-edit-items"]')).toBeNull();
  });

  it('should emit cancelled when the operator backs out', async () => {
    const emitted: void[] = [];
    fixture.componentInstance.cancelled.subscribe((): void => {
      emitted.push(undefined);
    });

    await render(checklist());
    root().querySelector<HTMLButtonElement>('[data-testid="checklist-edit-cancel"]')?.click();

    expect(emitted).toHaveLength(1);
  });
  it('keeps in-use items read-only while permitting a reference change', async () => {
    const emitted: UpdateChecklistInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await render(checklist({ canEditItems: false, canEditMetadata: true, referenceCode: 'OLD' }));
    expect(root().querySelector<HTMLInputElement>('#checklist-row-label-0')?.disabled).toBe(true);
    expect(root().querySelector('[data-testid="checklist-edit-item-add"]')).toBeNull();
    const reference = requiredElement<HTMLInputElement>('#checklist-reference');
    reference.value = 'NEW';
    reference.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    requiredElement<HTMLButtonElement>('[data-testid="checklist-edit-submit"]').click();
    await fixture.whenStable();
    expect(emitted).toEqual([{ referenceCode: 'NEW' }]);
  });

  it('requires a new version and does not copy a unique reference into a revision draft', async () => {
    const emitted: UpdateChecklistInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('creating', true);
    await render(checklist({ canEditItems: false, referenceCode: 'CHK-V1' }));
    expect(root().querySelector<HTMLInputElement>('#checklist-reference')?.value).toBe('');
    expect(root().querySelector<HTMLInputElement>('#checklist-row-label-0')?.disabled).toBe(false);
    requiredElement<HTMLButtonElement>('[data-testid="checklist-edit-submit"]').click();
    await fixture.whenStable();
    expect(emitted).toEqual([]);
    const version = requiredElement<HTMLInputElement>('#checklist-version');
    version.value = '2.0';
    version.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    requiredElement<HTMLButtonElement>('[data-testid="checklist-edit-submit"]').click();
    await fixture.whenStable();
    expect(emitted).toEqual([
      expect.objectContaining({ version: '2.0', referenceCode: null, items: expect.any(Array) }),
    ]);
  });

  it('emits a full item replacement only when the structure actually changes', async () => {
    const emitted: UpdateChecklistInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await render(checklist());
    requiredElement<HTMLButtonElement>('[data-testid="checklist-edit-item-remove-0"]').click();
    await fixture.whenStable();
    requiredElement<HTMLButtonElement>('[data-testid="checklist-edit-submit"]').click();
    await fixture.whenStable();
    expect(emitted).toEqual([
      {
        items: [
          { label: 'Check breakers', description: 'Visual check', required: false, position: 0 },
        ],
      },
    ]);
  });
});
