import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { MapAddFacilityFormData, MapAddFacilityFormValues } from './models';

/**
 * Component MapAddFacilityForm
 * @class MapAddFacilityForm
 *
 * @description
 * Inline sidebar form for dropping a new facility at the map's current
 * center: site name and city only, with a helper line clarifying where the
 * new pin lands. Purely presentational — the page owns the current map
 * center, the create call and re-rendering the marker list; this component
 * only validates and emits the two field values.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-map-add-facility-form
 *   [loading]="creating()"
 *   (submitted)="onAddFacility($event)"
 *   (cancelled)="closeAddFacilityForm()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-map-add-facility-form',
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './map-add-facility-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapAddFacilityForm {
  //#region Inputs
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the create call is in flight; disables the form and shows the
   * submit button's busy state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emitted with the trimmed field values when the user submits a valid form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<MapAddFacilityFormValues>}
   */
  public readonly submitted: OutputEmitterRef<MapAddFacilityFormValues> =
    output<MapAddFacilityFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emitted when the user dismisses the form without submitting.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
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
   * Reactive form for the two fields the map sidebar collects; every other
   * facility field is left to the full facility create/edit form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<MapAddFacilityFormData>}
   */
  protected readonly form: FormGroup<MapAddFacilityFormData> =
    this.formBuilder.group<MapAddFacilityFormData>({
      name: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ]),
      city: this.formBuilder.control<string>(''),
    });
  //#endregion

  //#region Constructor
  public constructor() {
    effect((): void => {
      if (this.loading()) {
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
   * Validates the form and emits the trimmed values if valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) return;

    const values: MapAddFacilityFormValues = this.form.getRawValue();
    this.submitted.emit({ name: values.name.trim(), city: values.city.trim() });
  }

  /**
   * Method onCancel
   * @method onCancel
   *
   * @description
   * Emits the cancelled event.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onCancel(): void {
    this.cancelled.emit();
  }
  //#endregion
}
