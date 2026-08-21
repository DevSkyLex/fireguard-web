import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { StoreError } from '@core/request-state';
import type { GenerateMaintenanceCampaignInput } from '@features/organization/features/maintenance-schedules/models';
import { HlmDialogImports } from '@shared/ui/dialog';
import { MaintenanceCampaignForm } from '../../forms/maintenance-campaign-form';

/**
 * Component MaintenanceCampaignDialog
 * @class MaintenanceCampaignDialog
 *
 * @description
 * The spartan dialog hosting {@link MaintenanceCampaignForm}, which
 * generates an inspection campaign from the schedules currently due.
 *
 * Purely presentational: it owns the overlay chrome, forwards every input
 * to the form, and re-emits {@link submitted} — the page keeps the store
 * call, the success toast/navigation and the organization IRI, which this
 * dialog never needs to know (`ARCHITECTURE.md` §10.5). Dismissal is
 * blocked while a request is in flight.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-campaign-dialog',
  imports: [MaintenanceCampaignForm, ...HlmDialogImports],
  templateUrl: './maintenance-campaign-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceCampaignDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the campaign-generation request is in flight, forwarded to the form and blocking dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last generation attempt failed with, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property facilityOptions
   * @readonly
   * @description The organization's facilities, forwarded to the form as the optional scoping choice.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly label: string; readonly value: string }>>}
   */
  public readonly facilityOptions: InputSignal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = input<ReadonlyArray<{ readonly label: string; readonly value: string }>>([]);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated scope, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<Omit<GenerateMaintenanceCampaignInput, 'organization'>>}
   */
  public readonly submitted: OutputEmitterRef<
    Omit<GenerateMaintenanceCampaignInput, 'organization'>
  > = output<Omit<GenerateMaintenanceCampaignInput, 'organization'>>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — escape, the backdrop, the close button — ignoring
   * the echo of a change the page already made.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
