import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateChecklistInput } from '@features/organization/features/checklists/models';
import { ChecklistCreateForm } from '../checklist-create-form.component';

describe('ChecklistCreateForm', () => {
  let fixture: ComponentFixture<ChecklistCreateForm>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const setInput = (id: string, value: string): void => {
    const input: HTMLInputElement | null = root().querySelector(`#${id}`);
    if (input === null) throw new Error(`missing input #${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistCreateForm);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('should not submit while the name is blank', async () => {
    const emitted: CreateChecklistInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateChecklistInput): void => {
      emitted.push(value);
    });

    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-submit"]')?.click();
    await fixture.whenStable();

    expect(emitted).toEqual([]);
    expect(root().textContent).toContain('Give the checklist a name.');
  });

  it('should stage an item and clear the draft row', async () => {
    setInput('checklist-create-item-label', 'Check fire extinguishers');
    await fixture.whenStable();

    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-add"]')?.click();
    await fixture.whenStable();

    expect(root().textContent).toContain('Check fire extinguishers');
    expect(root().querySelector<HTMLInputElement>('#checklist-create-item-label')?.value).toBe('');
  });

  it('should not stage an item with a blank label', async () => {
    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-add"]')?.click();
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="checklist-create-items"]')).toBeNull();
  });

  it('should remove a staged item', async () => {
    setInput('checklist-create-item-label', 'Check hydrants');
    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-add"]')?.click();
    await fixture.whenStable();

    root()
      .querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-remove-0"]')
      ?.click();
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="checklist-create-items"]')).toBeNull();
  });

  it('should reorder staged items with the move controls', async () => {
    setInput('checklist-create-item-label', 'First item');
    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-add"]')?.click();
    await fixture.whenStable();

    setInput('checklist-create-item-label', 'Second item');
    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-add"]')?.click();
    await fixture.whenStable();

    root()
      .querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-down-0"]')
      ?.click();
    await fixture.whenStable();

    const rows: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="checklist-create-items"] li'),
    ];

    expect(rows[0].textContent).toContain('Second item');
    expect(rows[1].textContent).toContain('First item');
  });

  it('should emit name, a fixed version and positioned items once valid', async () => {
    const emitted: CreateChecklistInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateChecklistInput): void => {
      emitted.push(value);
    });

    setInput('checklist-create-name', 'Fire Safety Inspection');
    setInput('checklist-create-item-label', 'Check extinguishers');
    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-item-add"]')?.click();
    await fixture.whenStable();

    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-submit"]')?.click();
    await fixture.whenStable();

    expect(emitted).toEqual([
      {
        name: 'Fire Safety Inspection',
        version: '1.0',
        items: [
          { label: 'Check extinguishers', description: undefined, required: true, position: 0 },
        ],
      },
    ]);
  });

  it('should emit cancelled when the operator backs out', async () => {
    const emitted: void[] = [];
    fixture.componentInstance.cancelled.subscribe((): void => {
      emitted.push(undefined);
    });

    root().querySelector<HTMLButtonElement>('[data-testid="checklist-create-cancel"]')?.click();

    expect(emitted.length).toBe(1);
  });

  it('should clear the draft once the hosting overlay closes', async () => {
    setInput('checklist-create-name', 'Should be discarded');
    await fixture.whenStable();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(root().querySelector<HTMLInputElement>('#checklist-create-name')?.value).toBe('');
  });
});
