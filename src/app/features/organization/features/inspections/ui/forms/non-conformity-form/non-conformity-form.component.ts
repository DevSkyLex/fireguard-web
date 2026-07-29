import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import type { NonConformitySeverity } from '@features/organization/features/inspections/models';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@shared/utils';
import type { NonConformityFormData, NonConformityFormValues } from './models';

/** Pristine values the form returns to once a finding is accepted. */
const EMPTY_NON_CONFORMITY = {
  description: '',
  severity: 'medium',
  dueAt: null,
  notes: '',
} as const;

/**
 * Form used to add a non-conformity to an inspection.
 */
@Component({
  selector: 'app-non-conformity-form',
  imports: [
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './non-conformity-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformityForm {
  /** Whether non-conformity submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /**
   * Last rejection of a submission, as held by the store's call state.
   *
   * Drives the field-level messages and the decision not to clear the form: this
   * surface stays mounted between attempts, so a refused finding must leave the
   * entry intact.
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  /** Emits valid non-conformity creation values. */
  public readonly submitted: OutputEmitterRef<NonConformityFormValues> = output();
  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );
  /** Message of the first violation naming no field of this form. */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () =>
      toUnmatchedViolations(this.serverError(), ['description', 'severity', 'dueAt', 'notes'])[0]
        ?.message ?? null,
  );
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);
  /** Supported non-conformity severity options. */
  protected readonly severityOptions: { label: string; value: NonConformitySeverity }[] = [
    { label: $localize`:@@ncSeverity.low:Low`, value: 'low' },
    { label: $localize`:@@ncSeverity.medium:Medium`, value: 'medium' },
    { label: $localize`:@@ncSeverity.high:High`, value: 'high' },
    { label: $localize`:@@ncSeverity.critical:Critical`, value: 'critical' },
  ];
  /** Strictly typed non-conformity form. */
  protected readonly form: FormGroup<NonConformityFormData> =
    this.formBuilder.group<NonConformityFormData>({
      description: this.formBuilder.control('', [Validators.required, Validators.minLength(3)]),
      severity: this.formBuilder.control<NonConformitySeverity>('medium', [Validators.required]),
      dueAt: new FormControl<Date | null>(null),
      notes: this.formBuilder.control(''),
    });

  /** Whether a submission was in flight on the previous evaluation. */
  private wasLoading = false;

  /**
   * Synchronizes the disabled state with submission, and clears the form once —
   * and only once — a finding has actually been accepted.
   *
   * This surface stays mounted between attempts, so it cannot rely on being
   * destroyed to come back empty. Clearing on emit instead threw away the entry
   * whenever the server refused it.
   */
  public constructor() {
    effect(() => {
      const loading: boolean = this.loading();
      const failed: boolean = this.serverError() !== null;

      untracked(() => {
        if (loading) this.form.disable({ emitEvent: false });
        else this.form.enable({ emitEvent: false });

        if (this.wasLoading && !loading && !failed) {
          this.form.reset(EMPTY_NON_CONFORMITY, { emitEvent: false });
        }

        this.wasLoading = loading;
      });
    });
  }

  /** Emits valid non-conformity values. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
