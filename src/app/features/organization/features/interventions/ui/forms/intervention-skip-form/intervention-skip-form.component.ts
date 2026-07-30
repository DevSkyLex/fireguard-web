import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { map } from 'rxjs';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@core/api';
import type { InterventionSkipFormData, InterventionSkipFormValues } from './models';

/**
 * Component InterventionSkipForm
 * @class InterventionSkipForm
 *
 * @description
 * Presentational form used to justify skipping a work item.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-skip-form',
  imports: [ButtonModule, MessageModule, ReactiveFormsModule, TextareaModule],
  templateUrl: './intervention-skip-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSkipForm {
  //#region Inputs
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a skip submission is in flight; disables all form controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input serverError
   * @input
   *
   * @description
   * Last rejection from the parent page, as held by the store's call state.
   *
   * A 422 names the field the server refused; projecting it tells the user which
   * one to fix instead of leaving them with a generic toast.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /** Message of the first violation naming no field of this form. */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () => toUnmatchedViolations(this.serverError(), ['reason'])[0]?.message ?? null,
  );

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether skipping is forbidden for the current user or context.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the trimmed skip reason when the form is submitted successfully.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionSkipFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionSkipFormValues> =
    output<InterventionSkipFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Builds the typed reactive form controls.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group holding the skip reason textarea control.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InterventionSkipFormData>}
   */
  protected readonly form: FormGroup<InterventionSkipFormData> =
    this.formBuilder.group<InterventionSkipFormData>({
      reason: this.formBuilder.control('', [Validators.required]),
    });

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether the form holds unsaved user edits, exposed so the host drawer
   * can guard accidental dismissal (Esc, backdrop) against data loss.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  public readonly dirty = toSignal(this.form.events.pipe(map((): boolean => this.form.dirty)), {
    initialValue: false,
  });

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes the form disabled state with the {@link loading} and
   * {@link disabled} inputs.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Validates the form, emits the trimmed skip reason via {@link submitted}
   * and resets the form. Marks controls as touched to surface validation
   * errors when the reason is empty.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit({ reason: this.form.controls.reason.value.trim() });
    // Deliberately no reset here: the outcome is not known yet. Clearing on emit
    // meant a rejected submit — or a dropped connection in the field — wiped what
    // the user typed. The drawer is destroyed when it closes, so the next open
    // starts from a fresh form anyway.
  }
  //#endregion
}
