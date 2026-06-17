import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import type {
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionCreateForm,
  type InterventionCreateFormValues,
} from '@features/organization/features/interventions/ui/forms';

/**
 * Component InterventionCreateDialog
 * @class InterventionCreateDialog
 *
 * @description
 * Presentational dialog hosting the guided {@link InterventionCreateForm}. Owns
 * only the modal shell and forwards visibility, loading state and selector
 * options through inputs while emitting the validated draft values and
 * visibility changes through outputs. All orchestration (options loading,
 * submission, navigation) stays with the parent page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-dialog',
  imports: [DialogModule, InterventionCreateForm],
  templateUrl: './intervention-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreateDialog {
  //#region Inputs
  /**
   * Input visible
   * @readonly
   *
   * @description
   * Whether the dialog is currently open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether a creation request is in flight; locks the form and the dialog.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input optionsLoading
   * @readonly
   *
   * @description
   * Whether site and member selector options are still loading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly optionsLoading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input siteOptions
   * @readonly
   *
   * @description
   * Available intervention site options for the site selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Input memberOptions
   * @readonly
   *
   * @description
   * Available organization member options for the participants and responsible
   * selectors.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Output visibleChange
   * @readonly
   *
   * @description
   * Emits the new visibility state when the dialog is opened or dismissed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Output submitted
   * @readonly
   *
   * @description
   * Emits the validated draft values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionCreateFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionCreateFormValues> =
    output<InterventionCreateFormValues>();
  //#endregion
}
