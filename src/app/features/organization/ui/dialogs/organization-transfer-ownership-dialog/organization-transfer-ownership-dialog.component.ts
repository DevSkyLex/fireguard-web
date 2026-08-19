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
import type { OrganizationTransferOwnershipConfirmedEvent } from '@features/organization/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldLabel } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';

/** The value standing in for "no member picked" in the combobox — a userId is never an empty string. */
const NO_CANDIDATE_VALUE = '';

/**
 * Component OrganizationTransferOwnershipDialog
 * @class OrganizationTransferOwnershipDialog
 *
 * @description
 * The danger zone's ownership-transfer confirmation: a member picker
 * (mirroring `FacilityMoveDialog`'s `hlm-combobox` pattern) plus the same
 * typed-organization-name confirmation gate {@link OrganizationDeleteDialog}
 * uses — the backend's own confirmation is the organization's **slug**, read
 * by the page from the resolved organization rather than typed here, exactly
 * as the delete dialog already does.
 *
 * Purely presentational: it owns no store, and its picked candidate and typed
 * name are its own draft, reset whenever {@link visible} opens
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-transfer-ownership-dialog
 *   [visible]="confirmingTransfer()"
 *   [organizationName]="organization().name"
 *   [candidates]="transferCandidates()"
 *   [pending]="settingsStore.isTransferringOwnership()"
 *   [error]="settingsStore.transferOwnershipError()?.message ?? null"
 *   (visibleChange)="confirmingTransfer.set($event)"
 *   (confirmed)="transferOwnership($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-transfer-ownership-dialog',
  imports: [HlmFieldLabel, HlmInput, ...HlmAlertDialogImports, ...HlmComboboxImports],
  templateUrl: './organization-transfer-ownership-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTransferOwnershipDialog {
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
   * Property organizationName
   * @readonly
   * @description The exact name the reader must type to unlock the confirm action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationName: InputSignal<string> = input.required<string>();

  /**
   * Property candidates
   * @readonly
   * @description Active, non-owner members eligible to receive ownership — `value` is each candidate's `userId`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  public readonly candidates: InputSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = input<ReadonlyArray<{ readonly value: string; readonly label: string }>>([]);

  /**
   * Property pending
   * @readonly
   * @description Whether the transfer is in flight, which locks the confirm action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The store's transfer failure message, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
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
   * Property confirmed
   * @readonly
   * @description Emits the picked candidate once the typed name matches and the reader confirms.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationTransferOwnershipConfirmedEvent>}
   */
  public readonly confirmed: OutputEmitterRef<OrganizationTransferOwnershipConfirmedEvent> =
    output<OrganizationTransferOwnershipConfirmedEvent>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Resets the picked candidate and typed name whenever the dialog opens.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      untracked((): void => {
        this.selectedUserId.set(NO_CANDIDATE_VALUE);
        this.typedName.set('');
      });
    });
  }
  //#endregion

  //#region Properties
  /** The candidate picked in this dialog, or `NO_CANDIDATE_VALUE` for none yet. */
  protected readonly selectedUserId: WritableSignal<string> = signal<string>(NO_CANDIDATE_VALUE);

  /** What has been typed into the confirmation field. */
  protected readonly typedName: WritableSignal<string> = signal<string>('');

  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property candidateLabelOf
   * @readonly
   * @description Names a picked candidate on the closed combobox trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly candidateLabelOf = (value: string): string =>
    this.candidates().find((candidate) => candidate.value === value)?.label ?? '';

  /**
   * Property confirmLabel
   * @readonly
   * @description The typed-confirmation field's label, naming the exact text required.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmLabel: Signal<string> = computed((): string => {
    const name: string = this.organizationName();

    return $localize`:@@org.settings.danger.transferConfirmLabel:Type ${name}:organizationName: to confirm`;
  });

  /**
   * Property canConfirm
   * @readonly
   * @description Whether a candidate is picked, the typed name matches exactly, and no transfer is already in flight.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canConfirm: Signal<boolean> = computed<boolean>(
    () =>
      this.selectedUserId() !== NO_CANDIDATE_VALUE &&
      this.typedName() === this.organizationName() &&
      !this.pending(),
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal back to the page.
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
   * Method onTypedNameInput
   * @method onTypedNameInput
   *
   * @description
   * Keeps the typed name in sync with the field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The input event.
   *
   * @returns {void}
   */
  protected onTypedNameInput(event: Event): void {
    this.typedName.set((event.target as HTMLInputElement).value);
  }

  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Emits the picked candidate once the typed name matches.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    if (!this.canConfirm()) return;

    this.confirmed.emit({ newOwnerUserId: this.selectedUserId() });
  }
  //#endregion
}
