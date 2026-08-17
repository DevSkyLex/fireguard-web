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
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { ChannelEditForm, type EditChannelDraft } from '../../forms/channel-edit-form';

/**
 * Component EditChannelDialog
 * @class EditChannelDialog
 *
 * @description
 * The spartan dialog hosting {@link ChannelEditForm}, the same shape
 * `OrganizationInviteDialog` wraps `OrganizationInviteForm` in.
 *
 * Purely presentational: it owns the overlay chrome, forwards
 * `visible`/`visibleChange` plus the seeding inputs to the form, and
 * re-emits {@link submitted}, closing itself the moment the form validates —
 * the entity updates in place through the shared `ChannelsStore`, so the
 * header and the list both pick up the change reactively without this
 * dialog waiting on the request. Dismissal is blocked while a request is in
 * flight (`ARCHITECTURE.md` §10.5).
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-edit-channel-dialog
 *   [visible]="editDialogVisible()"
 *   [name]="channel()?.name ?? ''"
 *   [parentChannelId]="currentParentId()"
 *   [parentOptions]="rootChannelOptions()"
 *   (submitted)="submitEdit($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-edit-channel-dialog',
  imports: [
    ChannelEditForm,
    HlmDialog,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
  ],
  templateUrl: './edit-channel-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditChannelDialog {
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
   * Property name
   * @readonly
   *
   * @description
   * The channel's current name, forwarded to the form to seed the draft.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input<string>('');

  /**
   * Property parentChannelId
   * @readonly
   *
   * @description
   * The channel's current parent, or `null` at the top level.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly parentChannelId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Root channels other than this one, forwarded to the form as candidate
   * parents.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  public readonly parentOptions: InputSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = input<ReadonlyArray<{ readonly value: string; readonly label: string }>>([]);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a write this dialog's submit triggered — a rename or a move — is
   * still in flight, forwarded to the form and blocking dismissal.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
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
   * Property submitted
   * @readonly
   *
   * @description
   * The form's validated name and parent, forwarded untouched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<EditChannelDraft>}
   */
  public readonly submitted: OutputEmitterRef<EditChannelDraft> = output<EditChannelDraft>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * The overlay's own open/closed state, derived from {@link visible} so the
   * page stays the single owner of whether the dialog is up.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal — escape, the backdrop, the close button — back to
   * the page, which owns the flag this is derived from. Ignored while a
   * request is in flight, matching the bound `disableClose`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method onFormSubmitted
   * @method onFormSubmitted
   *
   * @description
   * Re-emits the form's validated draft and closes the dialog.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditChannelDraft} draft - The validated name and parent.
   *
   * @returns {void}
   */
  protected onFormSubmitted(draft: EditChannelDraft): void {
    this.submitted.emit(draft);
    this.visibleChange.emit(false);
  }
  //#endregion
}
