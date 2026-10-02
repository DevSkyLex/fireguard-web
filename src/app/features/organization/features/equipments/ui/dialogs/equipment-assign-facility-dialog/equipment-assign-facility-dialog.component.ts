import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { idleCallState, type CallState } from '@core/request-state';
import type { FacilityOption } from '@features/organization/features/facilities/models';
import { FacilityOptionPicker } from '@features/organization/features/facilities/ui/components';
import { HlmButton } from '@shared/ui/button';

import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';

/**
 * Constant NO_PICK_VALUE
 *
 * @description
 * The value standing in for "no facility picked" in the combobox — a facility id is never an empty
 * string.
 */
const NO_PICK_VALUE = '';

/**
 * Class EquipmentAssignFacilityDialog
 * @class EquipmentAssignFacilityDialog
 *
 * @description
 * The facility picker opened from the equipment detail header's facility
 * row, mirroring `FacilityMoveDialog`'s `hlm-combobox` pattern. Offers every
 * facility the page preloaded through the `facilities` subfeature's
 * read-only `FacilityService.list` (`FEATURE.md` "Cross-Feature
 * Dependencies") and, when the equipment already carries an assignment, an
 * "Unassign" action beside the primary "Assign" one — no separate confirm
 * dialog, matching this page's own Decommission action.
 *
 * Purely presentational: it owns no store, and the picked facility is its
 * own draft, seeded from {@link currentFacilityId} whenever {@link visible}
 * opens (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-equipment-assign-facility-dialog
 *   [visible]="assignFacilityDialogVisible()"
 *   [currentFacilityId]="activeEquipmentStore.selectedEquipment()?.facilityId ?? null"
 *   [options]="facilityOptions()"
 *   [assigning]="store.assignToFacilityCallState().status === 'pending'"
 *   [unassigning]="store.unassignFromFacilityCallState().status === 'pending'"
 *   (visibleChange)="assignFacilityDialogVisible.set($event)"
 *   (assigned)="onFacilityAssigned($event)"
 *   (unassigned)="onFacilityUnassigned()"
 * />
 * ```
 */
@Component({
  selector: 'app-equipment-assign-facility-dialog',
  imports: [FacilityOptionPicker, HlmButton, ...HlmDialogImports, ...HlmFieldImports],
  templateUrl: './equipment-assign-facility-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentAssignFacilityDialog {
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
   * Whether the dialog is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property currentFacilityId
   * @readonly
   *
   * @description
   * The equipment's currently assigned facility, or `null`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentFacilityId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property options
   * @readonly
   *
   * @description
   * The organization's facilities, preloaded by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly options: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);

  /**
   * Property assigning
   * @readonly
   *
   * @description
   * Whether an assign write is in flight, which locks both actions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly assigning: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property unassigning
   * @readonly
   *
   * @description
   * Whether an unassign write is in flight, which locks both actions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly unassigning: InputSignal<boolean> = input<boolean>(false);
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
   * Reports the dialog opening or closing, including a dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property assigned
   * @readonly
   *
   * @description
   * The picked facility id, once confirmed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly assigned: OutputEmitterRef<string> = output<string>();

  /**
   * Property unassigned
   * @readonly
   *
   * @description
   * The current assignment should be cleared.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly unassigned: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds the picked facility from {@link currentFacilityId} whenever the dialog opens.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      const current: string | null = this.currentFacilityId();

      untracked((): void => this.selectedFacilityId.set(current ?? NO_PICK_VALUE));
    });
  }
  //#endregion

  //#region Properties
  /**
   * Property selectedFacilityId
   * @readonly
   *
   * @description
   * The facility picked in this dialog, or `NO_PICK_VALUE` for none yet.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly selectedFacilityId: WritableSignal<string> = signal<string>(NO_PICK_VALUE);

  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * The overlay's own open/closed state, derived from {@link visible}.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property canUnassign
   * @readonly
   *
   * @description
   * Whether the equipment already carries an assignment to clear.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canUnassign: Signal<boolean> = computed<boolean>(
    () => this.currentFacilityId() !== null,
  );

  /**
   * Property busy
   * @readonly
   *
   * @description
   * Whether either action may run right now.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly busy: Signal<boolean> = computed<boolean>(
    () => this.assigning() || this.unassigning(),
  );

  /**
   * Property canAssign
   * @readonly
   *
   * @description
   * Whether the primary Assign action may submit.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAssign: Signal<boolean> = computed<boolean>(
    () => this.selectedFacilityId() !== NO_PICK_VALUE && !this.busy(),
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays the overlay's open/closed transitions.
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

  /**
   * Method submitAssign
   *
   * @description
   * Emits {@link assigned} for the picked facility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submitAssign(): void {
    if (!this.canAssign()) return;

    this.assigned.emit(this.selectedFacilityId());
  }

  /**
   * Method submitUnassign
   *
   * @description
   * Emits {@link unassigned}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submitUnassign(): void {
    if (this.busy()) return;

    this.unassigned.emit();
  }
  //#endregion
}
