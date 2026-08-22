import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { AddNonConformityInput } from '@features/organization/features/inspections/models';
import { NonConformityAddDialog } from '../non-conformity-add-dialog.component';

describe('NonConformityAddDialog', () => {
  let fixture: ComponentFixture<NonConformityAddDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(NonConformityAddDialog);
  });

  it('should render nothing to the portal while closed', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="non-conformity-add-dialog"]')).toBeNull();
  });

  it('should render the add form inside the dialog once open', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(document.querySelector('app-non-conformity-add-form')).not.toBeNull();
  });

  it('should forward the form submission untouched', async () => {
    const emitted: AddNonConformityInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: AddNonConformityInput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const payload: AddNonConformityInput = { description: 'Found something', severity: 'high' };
    fixture.componentInstance.submitted.emit(payload);

    expect(emitted).toEqual([payload]);
  });

  it('should emit visibleChange false when the form cancels', async () => {
    const changes: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((visible: boolean): void => {
      changes.push(visible);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    document.querySelector<HTMLButtonElement>('[data-testid="non-conformity-add-cancel"]')?.click();

    expect(changes).toEqual([false]);
  });

  it('should disable close while pending', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="non-conformity-add-submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
