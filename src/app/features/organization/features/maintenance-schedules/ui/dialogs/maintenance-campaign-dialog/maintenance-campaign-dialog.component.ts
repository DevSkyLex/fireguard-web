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
import { idleCallState, type CallState, type StoreError } from '@core/request-state';
import type { FacilityOption } from '@features/organization/features/facilities/models';
import type { GenerateMaintenanceCampaignInput } from '@features/organization/features/maintenance-schedules/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheetImports } from '@shared/ui/sheet';
import { MaintenanceCampaignForm } from '../../forms/maintenance-campaign-form';

/**
 * Class MaintenanceCampaignDialog
 * @class MaintenanceCampaignDialog
 *
 * @description
 * The spartan sheet hosting one persistent {@link MaintenanceCampaignForm}, which
 * generates an inspection campaign from the schedules currently due.
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
  imports: [MaintenanceCampaignForm, ...HlmSheetImports],
  templateUrl: './maintenance-campaign-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceCampaignDialog {
  /**
   * Property side
   * @readonly
   *
   * @description
   * The central interaction mode chooses bottom or right without recreating the campaign draft.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
  //#region Inputs
  /**
   * Property facilityPage
   * @readonly
   *
   * @description
   * Current facility server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly facilityPage: InputSignal<number> = input<number>(1);
  /**
   * Property facilityPageCount
   * @readonly
   *
   * @description
   * Number of facility server pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly facilityPageCount: InputSignal<number> = input<number>(1);
  /**
   * Property facilityCallState
   * @readonly
   *
   * @description
   * Request state for facility options.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly facilityCallState: InputSignal<CallState> = input<CallState>(idleCallState());
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the dialog is open. Owned by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the campaign-generation request is in flight, forwarded to the form and blocking
   * dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Whatever the last generation attempt failed with, forwarded to the form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * The organization's facilities, forwarded to the form as the optional scoping choice.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly facilityOptions: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property facilitySearchChanged
   * @readonly
   *
   * @description
   * Search entered in the server facility selector.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly facilitySearchChanged: OutputEmitterRef<string> = output<string>();
  /**
   * Property facilityPageChanged
   * @readonly
   *
   * @description
   * Requested facility server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly facilityPageChanged: OutputEmitterRef<number> = output<number>();
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * The dialog wants to open or close.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * The form's validated scope, forwarded untouched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef< Omit<GenerateMaintenanceCampaignInput, 'organization'> >}
   */
  public readonly submitted: OutputEmitterRef<
    Omit<GenerateMaintenanceCampaignInput, 'organization'>
  > = output<Omit<GenerateMaintenanceCampaignInput, 'organization'>>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * The overlay state, derived from {@link visible} so there is no second copy of the truth.
   *
   * @access protected
   * @since 1.0.0
   *
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
