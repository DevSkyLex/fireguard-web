import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { ChannelCreateForm, type ChannelCreateDraft } from '../../forms/channel-create-form';

/**
 * Component ChannelCreateSheet
 * @class ChannelCreateSheet
 *
 * @description
 * The spartan sheet hosting {@link ChannelCreateForm}, the same shape
 * `OrganizationInviteDialog` wraps `OrganizationInviteForm` in — but a sheet,
 * since a channel is a record the operator opens next (`DESIGN.md`).
 *
 * Purely presentational: it owns the overlay chrome, forwards
 * `visible`/`visibleChange` to the form and re-emits {@link submitted},
 * closing itself the moment the form validates — the page's own success
 * event is what actually navigates, and a failure is already surfaced by
 * the app-wide feedback listener (`core/feedback`), so there is nothing
 * this sheet needs to wait for. Dismissal is blocked while a request is in
 * flight (`ARCHITECTURE.md` §10.5). An Escape or outside-click on a dirty
 * draft is undone and turned into the shared unsaved-changes confirmation,
 * exactly as `facility-create-sheet` does.
 *
 * @version 2.1.0
 *
 * @example
 * ```html
 * <app-channel-create-sheet
 *   [visible]="createDialogVisible()"
 *   [parentOptions]="rootChannelOptions()"
 *   (submitted)="create($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-create-sheet',
  imports: [ChannelCreateForm, UnsavedChangesDialog, ...HlmSheetImports],
  templateUrl: './channel-create-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelCreateSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the panel is open.
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
   * Reports the panel opening or closing, including a dismissal.
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

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Clears {@link dirty} whenever the panel closes, so an abandoned draft cannot make the next opening confirm over nothing.
   * @access public
   * @since 2.1.0
   */
  public constructor() {
    effect((): void => {
      const isVisible: boolean = this.visible();

      untracked((): void => {
        if (!isVisible) this.dirty.set(false);
      });
    });
  }
  //#endregion

  //#region Properties
  /**
   * Property sheetState
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
  protected readonly sheetState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 2.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property dirty
   * @readonly
   * @description Whether closing right now would lose something — set from the form's `dirtyChanged`. Gates {@link requestClose}.
   * @access protected
   * @since 2.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared {@link UnsavedChangesDialog}, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 2.1.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property sheetRef
   * @readonly
   * @description The panel directive, queried so {@link onStateChanged} can reopen it to undo an Escape/outside-click made while {@link dirty}.
   * @access protected
   * @since 2.1.0
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef: Signal<HlmSheet | undefined> = viewChild(HlmSheet);
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal — escape, the backdrop, the close button — back to
   * the page, which owns the flag this is derived from. Ignored while a
   * request is in flight, matching the bound `disableClose`; a dismissal
   * reaching here while {@link dirty} is undone and redirected to the
   * confirmation.
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

    if (!isOpen && this.dirty()) {
      this.sheetRef()?.open();
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @description The panel's own close action, reached from the form's Cancel. Closes right away when nothing would be lost; otherwise asks first.
   * @access protected
   * @since 2.1.0
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.dirty()) {
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @description The operator chose to discard the draft — closes both the confirmation and the panel.
   * @access protected
   * @since 2.1.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesDismissed
   * @description The operator chose to keep editing — closes the confirmation only.
   * @access protected
   * @since 2.1.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }

  /**
   * Method onFormSubmitted
   * @method onFormSubmitted
   *
   * @description
   * Re-emits the form's validated draft and closes the panel.
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
