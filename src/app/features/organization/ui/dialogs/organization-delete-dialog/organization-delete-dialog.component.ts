import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmFieldLabel } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';

/**
 * Component OrganizationDeleteDialog
 * @class OrganizationDeleteDialog
 *
 * @description
 * The danger zone's last gate: an alert dialog that only enables its confirm
 * action once the reader has typed the organization's exact name, so the
 * irreversible delete cannot fire on a stray click.
 *
 * The typed value is UI-only and never leaves this component as its own
 * payload — it exists purely to gate {@link confirmed}, so it is a plain
 * signal rather than a Signal Forms field tree, matching how
 * `NewDirectMessageDialog` treats its own transient search text.
 *
 * Presentational: it emits {@link confirmed} and never calls the store itself
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-delete-dialog
 *   [visible]="confirmingDelete()"
 *   [organizationName]="organization().name"
 *   [pending]="settingsStore.isDeleting()"
 *   [error]="settingsStore.deleteError()?.message ?? null"
 *   (visibleChange)="confirmingDelete.set($event)"
 *   (confirmed)="deleteOrganization()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-delete-dialog',
  imports: [HlmFieldLabel, HlmInput, ...HlmAlertDialogImports],
  templateUrl: './organization-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDeleteDialog {
  //#region Inputs
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
   * Property organizationName
   * @readonly
   *
   * @description
   * The exact name the reader must type to unlock the confirm action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationName: InputSignal<string> = input.required<string>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the deletion is in flight, which locks the confirm action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * The store's deletion failure message, or `null`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
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
   * Property confirmed
   * @readonly
   *
   * @description
   * Emits once the typed name matches and the reader activates the confirm
   * action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property typedName
   * @readonly
   *
   * @description
   * What has been typed into the confirmation field. UI-only — see the class
   * doc for why this is a plain signal rather than a Signal Forms field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
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
   * Property confirmText
   * @readonly
   *
   * @description
   * The warning naming the organization about to be deleted. Built here
   * rather than interpolated in the template: a named `$localize`
   * placeholder extracts as one translatable sentence, where a template
   * interpolation would extract as a positional `INTERPOLATION` id a
   * translator cannot reorder.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmText: Signal<string> = computed((): string => {
    const name: string = this.organizationName();

    return $localize`:@@org.settings.danger.confirmText:This permanently deletes ${name}:organizationName: — its facilities, equipment, inspections, interventions and members. This cannot be undone.`;
  });

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

    return $localize`:@@org.settings.danger.confirmLabel:Type ${name}:organizationName: to confirm`;
  });

  /**
   * Property canConfirm
   * @readonly
   *
   * @description
   * Whether the typed name matches exactly and no deletion is already in
   * flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canConfirm: Signal<boolean> = computed<boolean>(
    () => this.typedName() === this.organizationName() && !this.pending(),
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal back to the page and clears the typed name so a
   * reopened dialog starts empty.
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

    if (!isOpen) this.typedName.set('');

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
   * Emits the confirmed deletion once the typed name matches.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    if (!this.canConfirm()) return;

    this.confirmed.emit();
  }
  //#endregion
}
