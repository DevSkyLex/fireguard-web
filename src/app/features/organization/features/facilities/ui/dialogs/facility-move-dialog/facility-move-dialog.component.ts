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
import type {
  FacilityOption,
  FacilityMoveRequest,
  FacilityMoveSubmittedEvent,
} from '@features/organization/features/facilities/models';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';

/** The value standing in for "no parent" in the combobox — a facility id is never an empty string. */
const ROOT_OPTION_VALUE = '';

/**
 * Component FacilityMoveDialog
 * @class FacilityMoveDialog
 *
 * @description
 * The facility picker opened from the asset explorer tree's "Move to…"
 * action — the keyboard/AT path for the same re-parent the tree's pointer
 * drag-drop offers as an enhancement (`ARCHITECTURE.md` §10.3, `shared/tree`
 * `Tree`'s a11y contract). Mirrors `InterventionAssignDialog`'s
 * `hlm-combobox` pattern.
 *
 * Purely presentational: it owns no store and takes its open state from
 * {@link request} being non-null. The picked target is this dialog's own
 * draft, reset to the root option whenever {@link request} changes; the
 * caller keeps every write and decides what to dispatch from
 * {@link submitted}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-move-dialog',
  imports: [HlmButton, ...HlmComboboxImports, ...HlmDialogImports, ...HlmFieldImports],
  templateUrl: './facility-move-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMoveDialog {
  //#region Inputs
  /**
   * Property request
   * @readonly
   * @description What is pending a move, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityMoveRequest | null>}
   */
  public readonly request: InputSignal<FacilityMoveRequest | null> =
    input<FacilityMoveRequest | null>(null);

  /**
   * Property options
   * @readonly
   * @description Candidate parents offered — every other currently loaded facility.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly options: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);

  /**
   * Property busy
   * @readonly
   * @description Whether the caller's move for this facility is in flight, which disables submitting again.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The picked target, for the pending request.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityMoveSubmittedEvent>}
   */
  public readonly submitted: OutputEmitterRef<FacilityMoveSubmittedEvent> =
    output<FacilityMoveSubmittedEvent>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without submitting — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Resets the picked target to the root option whenever a new request opens.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      this.request();
      untracked((): void => this.selectedParent.set(ROOT_OPTION_VALUE));
    });
  }
  //#endregion

  //#region Properties
  /** The parent picked in this dialog. `ROOT_OPTION_VALUE` stands for "no parent". */
  protected readonly selectedParent: WritableSignal<string> = signal<string>(ROOT_OPTION_VALUE);

  /** The dialog state, derived from {@link request} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.request() === null ? 'closed' : 'open',
  );

  /** The dialog's body, naming the facility being moved. */
  protected readonly description: Signal<string> = computed<string>(() => {
    const name: string = this.request()?.facilityName ?? '';

    return $localize`:@@facility.moveDialog.message:Choose the new parent for ${name}:facilityName:.`;
  });

  /** Names a picked target on the closed combobox trigger, including the root option. */
  protected readonly parentLabelOf: (value: string) => string = (value: string): string =>
    value === ROOT_OPTION_VALUE
      ? this.rootOptionLabel
      : (this.options().find((option) => option.value === value)?.label ?? '');

  /** The localized label standing for "no parent" in the combobox. */
  protected readonly rootOptionLabel: string = $localize`:@@facility.moveDialog.rootOption:No parent (root level)`;
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link request}, so it
   * is ignored here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The dialog's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method submit
   * @description Emits {@link submitted} for the pending request with the picked target.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submit(): void {
    const request: FacilityMoveRequest | null = this.request();
    if (request === null) return;

    const parent: string = this.selectedParent();

    this.submitted.emit({
      facilityId: request.facilityId,
      parentFacilityId: parent === ROOT_OPTION_VALUE ? null : parent,
    });
  }
  //#endregion
}
