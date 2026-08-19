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
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';

/** The value standing in for "no facility picked" in the combobox — a facility id is never an empty string. */
const NO_PICK_VALUE = '';

/**
 * Component EquipmentAssignFacilityDialog
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
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-assign-facility-dialog',
  imports: [HlmButton, ...HlmComboboxImports, ...HlmDialogImports, ...HlmFieldImports],
  templateUrl: './equipment-assign-facility-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentAssignFacilityDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property currentFacilityId
   * @readonly
   * @description The equipment's currently assigned facility, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly currentFacilityId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property options
   * @readonly
   * @description The organization's facilities, preloaded by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  public readonly options: InputSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = input<ReadonlyArray<{ readonly value: string; readonly label: string }>>([]);

  /**
   * Property assigning
   * @readonly
   * @description Whether an assign write is in flight, which locks both actions.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly assigning: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property unassigning
   * @readonly
   * @description Whether an unassign write is in flight, which locks both actions.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly unassigning: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the dialog opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property assigned
   * @readonly
   * @description The picked facility id, once confirmed.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly assigned: OutputEmitterRef<string> = output<string>();

  /**
   * Property unassigned
   * @readonly
   * @description The current assignment should be cleared.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly unassigned: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Seeds the picked facility from {@link currentFacilityId} whenever the dialog opens.
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
  /** The facility picked in this dialog, or `NO_PICK_VALUE` for none yet. */
  protected readonly selectedFacilityId: WritableSignal<string> = signal<string>(NO_PICK_VALUE);

  /** The overlay's own open/closed state, derived from {@link visible}. */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /** Whether the equipment already carries an assignment to clear. */
  protected readonly canUnassign: Signal<boolean> = computed<boolean>(
    () => this.currentFacilityId() !== null,
  );

  /** Whether either action may run right now. */
  protected readonly busy: Signal<boolean> = computed<boolean>(
    () => this.assigning() || this.unassigning(),
  );

  /** Whether the primary Assign action may submit. */
  protected readonly canAssign: Signal<boolean> = computed<boolean>(
    () => this.selectedFacilityId() !== NO_PICK_VALUE && !this.busy(),
  );

  /** Names a picked facility on the closed combobox trigger. */
  protected readonly facilityLabelOf: (value: string) => string = (value: string): string =>
    this.options().find((option) => option.value === value)?.label ?? '';
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @description Relays the overlay's open/closed transitions.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method submitAssign
   * @description Emits {@link assigned} for the picked facility.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submitAssign(): void {
    if (!this.canAssign()) return;

    this.assigned.emit(this.selectedFacilityId());
  }

  /**
   * Method submitUnassign
   * @description Emits {@link unassigned}.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submitUnassign(): void {
    if (this.busy()) return;

    this.unassigned.emit();
  }
  //#endregion
}
