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
    expect(rows[0].textContent).toContain('Check panel');
    expect(rows[1].textContent).toContain('Check breakers');
    expect(rows[1].textContent).toContain('Optional');
  });

  it('should emit the edited name and full item replacement list', async () => {
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

    expect(emitted).toEqual([
      {
        name: 'Electrical audit v2',
        items: [
          { label: 'Check panel', description: undefined, required: true, position: 0 },
          { label: 'Check breakers', description: 'Visual check', required: false, position: 1 },
        ],
      },
    ]);
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
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Check breakers');
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

    expect(emitted.length).toBe(1);
  });
});
