import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  provideZonelessChangeDetection,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type {
  InterventionRecurrenceFormTarget,
  InterventionRecurrenceFormValues,
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { InterventionRecurrenceSheet } from '../intervention-recurrence-sheet.component';

/** Stands in for the real form so this spec stays at the sheet's own boundary. */
@Component({
  selector: 'app-intervention-recurrence-form',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class InterventionRecurrenceFormStub {
  public readonly recurrence: InputSignal<InterventionRecurrenceOutput | null> =
    input<InterventionRecurrenceOutput | null>(null);
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  public readonly serverError: InputSignal<string | null> = input<string | null>(null);
  public readonly templates: InputSignal<readonly InterventionTemplateOutput[]> = input<
    readonly InterventionTemplateOutput[]
  >([]);
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  public readonly submitted: OutputEmitterRef<InterventionRecurrenceFormValues> =
    output<InterventionRecurrenceFormValues>();
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
}

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-recurrence-sheet"]');

const unsavedChangesDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="unsaved-changes-dialog"]');

const recurrence: InterventionRecurrenceOutput = {
  id: 'recurrence-1',
} as InterventionRecurrenceOutput;

const pressEscape = (): void => {
  panel()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

const formStub = (fixture: ComponentFixture<InterventionRecurrenceSheet>) => {
  const debugElement = fixture.debugElement.query(By.directive(InterventionRecurrenceFormStub));

  return debugElement?.componentInstance as InterventionRecurrenceFormStub;
};

describe('InterventionRecurrenceSheet', () => {
  let fixture: ComponentFixture<InterventionRecurrenceSheet>;
  let closed: number;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.overrideComponent(InterventionRecurrenceSheet, {
      set: { imports: [InterventionRecurrenceFormStub, UnsavedChangesDialog, ...HlmSheetImports] },
    });

    fixture = TestBed.createComponent(InterventionRecurrenceSheet);
    await fixture.whenStable();

    closed = 0;
    fixture.componentInstance.closed.subscribe((): void => {
      closed += 1;
    });
  });

  it('should stay closed while the target is null', async () => {
    fixture.componentRef.setInput('target', null);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it("should open for a blank draft when the target is 'create'", async () => {
    fixture.componentRef.setInput('target', 'create');
    await fixture.whenStable();

    expect(panel()).not.toBeNull();
    expect(formStub(fixture).recurrence()).toBeNull();
  });

  it('should open seeded for an edit when the target is a recurrence row', async () => {
    fixture.componentRef.setInput('target', recurrence satisfies InterventionRecurrenceFormTarget);
    await fixture.whenStable();

    expect(panel()).not.toBeNull();
    expect(formStub(fixture).recurrence()).toBe(recurrence);
  });

  it('should refuse dismissal while a write is in flight', async () => {
    fixture.componentRef.setInput('target', 'create');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(closed).toBe(0);
    expect(panel()).not.toBeNull();
  });

  it("should relay the form's submitted values", async () => {
    fixture.componentRef.setInput('target', 'create');
    await fixture.whenStable();

    const emitted: InterventionRecurrenceFormValues[] = [];
    fixture.componentInstance.submitted.subscribe(
      (value: InterventionRecurrenceFormValues): void => {
        emitted.push(value);
      },
    );

    const values: InterventionRecurrenceFormValues = {
      recurrenceId: null,
    } as InterventionRecurrenceFormValues;
    formStub(fixture).submitted.emit(values);
    await fixture.whenStable();

    expect(emitted).toEqual([values]);
  });

  it('should close directly on cancel when the form is clean', async () => {
    fixture.componentRef.setInput('target', 'create');
    await fixture.whenStable();

    formStub(fixture).cancelled.emit();
    await fixture.whenStable();

    expect(closed).toBe(1);
    expect(unsavedChangesDialog()).toBeNull();
  });

  it('should open the unsaved changes dialog instead of closing when the form is dirty', async () => {
    fixture.componentRef.setInput('target', 'create');
    await fixture.whenStable();

    formStub(fixture).dirtyChanged.emit(true);
    await fixture.whenStable();

    formStub(fixture).cancelled.emit();
    await fixture.whenStable();

    expect(closed).toBe(0);
    expect(unsavedChangesDialog()).not.toBeNull();
  });

  it('should close and discard once the reader confirms the unsaved changes dialog', async () => {
    fixture.componentRef.setInput('target', 'create');
    await fixture.whenStable();

    formStub(fixture).dirtyChanged.emit(true);
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    await fixture.whenStable();

    expect(closed).toBe(1);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });

  it('should stay open once the reader dismisses the unsaved changes dialog', async () => {
    fixture.componentRef.setInput('target', 'create');
    await fixture.whenStable();

    formStub(fixture).dirtyChanged.emit(true);
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesDismissed']();
    await fixture.whenStable();

    expect(closed).toBe(0);
    expect(panel()).not.toBeNull();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });
});
