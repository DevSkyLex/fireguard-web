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
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { ChannelCreateForm, type ChannelCreateDraft } from '../../forms/channel-create-form';

/**
 * Component ChannelCreateDialog
 * @class ChannelCreateDialog
 *
 * @description
 * The spartan dialog hosting {@link ChannelCreateForm}, the same shape
 * `OrganizationInviteDialog` wraps `OrganizationInviteForm` in.
 *
 * Purely presentational: it owns the overlay chrome, forwards
 * `visible`/`visibleChange` to the form and re-emits {@link submitted},
 * closing itself the moment the form validates — the page's own success
 * event is what actually navigates, and a failure is already surfaced by
 * the app-wide feedback listener (`core/feedback`), so there is nothing
 * this dialog needs to wait for. Dismissal is blocked while a request is in
 * flight (`ARCHITECTURE.md` §10.5).
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-channel-create-dialog
 *   [visible]="createDialogVisible()"
 *   [parentOptions]="rootChannelOptions()"
 *   (submitted)="create($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-create-dialog',
  imports: [
    ChannelCreateForm,
    HlmDialog,
    HlmDialogContent,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
  ],
  templateUrl: './channel-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelCreateDialog {
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
   * Property parentOptions
   * @readonly
   *
   * @description
   * Root channels the new one may be nested under, forwarded to the form.
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
   * Whether a previous submission is still in flight, forwarded to the form
   * and blocking dismissal.
   *
   * @access public
   * @since 1.0.0
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
   * The form's validated name and optional parent, forwarded untouched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<ChannelCreateDraft>}
   */
  public readonly submitted: OutputEmitterRef<ChannelCreateDraft> = output<ChannelCreateDraft>();
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
   * @param {ChannelCreateDraft} draft - The validated name and optional parent.
   *
   * @returns {void}
   */
  protected onFormSubmitted(draft: ChannelCreateDraft): void {
    this.submitted.emit(draft);
    this.visibleChange.emit(false);
  }
  //#endregion
}
