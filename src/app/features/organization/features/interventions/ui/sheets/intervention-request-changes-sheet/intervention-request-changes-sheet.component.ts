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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import {
  InterventionRequestChangesForm,
  type InterventionRequestChangesFormValues,
} from '../../forms/intervention-request-changes-form';

/**
 * Component InterventionRequestChangesSheet
 * @class InterventionRequestChangesSheet
 *
 * @description
 * The spartan sheet hosting {@link InterventionRequestChangesForm}.
 *
 * Purely presentational: it owns the panel, forwards `visible`/`visibleChange`
 * and re-emits the form's `submitted`; the page keeps the orchestration
 * (`ARCHITECTURE.md` §10.5). Its open state is derived from `visible` rather
 * than held locally, so the page stays the single owner and the two cannot
 * drift.
 *
 * Dismissal is blocked while the transition is in flight. Cancel always
 * closes when the note is clean: the guard is against losing the note by
 * accident, never against leaving deliberately.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`)
 * instead of a right-hand panel, so its footer lands in the thumb zone.
 *
 * Closing goes exclusively through {@link requestClose}: `disableClose` is
 * hard-`true` (never reactive) so brn's own Escape/outside-click `dismiss()`
 * is permanently a no-op, the vendored close button is replaced with a plain
 * one wired to {@link requestClose} (it otherwise calls the dialog ref's
 * `close()` directly, bypassing any gate), and a local `(keydown.escape)`
 * binding restores Escape by routing it through the same method. No
 * `reopen()`-on-`stateChanged` workaround: the previous approach read
 * whether a still-mid-close dialog ref could be resurrected, a comparison
 * that raced with the overlay stack and flaked under WebKit — every close
 * attempt landing on one gate before the dialog ref is ever touched removes
 * that race entirely.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-request-changes-sheet',
  imports: [
    InterventionRequestChangesForm,
    NgIcon,
    HlmButton,
    UnsavedChangesDialog,
    ...HlmSheetImports,
  ],
  providers: [provideIcons({ lucideX })],
  templateUrl: './intervention-request-changes-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRequestChangesSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the panel is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the transition request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   * @description Whether the reviewer may act, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the transition failed with, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The panel wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated note, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionRequestChangesFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionRequestChangesFormValues> =
    output<InterventionRequestChangesFormValues>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears {@link dirty} whenever the panel closes, so a draft abandoned once
   * cannot make the next opening raise a confirmation over nothing.
   *
   * @access public
   * @since 7.1.0
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
   * @description The panel state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 1.1.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether closing right now would lose something — set from
   * {@link InterventionRequestChangesForm.dirtyChanged}. Gates
   * {@link requestClose}. A reviewer's note is typed prose: losing it to a
   * stray Escape means writing it again from memory.
   *
   * @access protected
   * @since 7.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared {@link UnsavedChangesDialog}, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 7.1.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays the panel's own state, ignoring the echo of a change the page
   * already made. With `disableClose` hard-`true` and the vendored close
   * button replaced, brn never drives an unrequested `'closed'` here on its
   * own — every real closing attempt reaches {@link requestClose} first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * The panel's single closing gate — reached from the form's Cancel, the
   * plain close button, and the local Escape binding alike. A no-op while
   * {@link pending} (a transition is in flight); otherwise closes right away
   * when nothing would be lost, or opens {@link UnsavedChangesDialog} and
   * defers to {@link onUnsavedChangesConfirmed} /
   * {@link onUnsavedChangesDismissed}.
   *
   * @access protected
   * @since 7.1.0
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.pending()) return;

    if (this.dirty()) {
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @method onUnsavedChangesConfirmed
   * @description The operator chose to discard the draft — closes both the confirmation and the panel itself.
   * @access protected
   * @since 7.1.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesDismissed
   * @method onUnsavedChangesDismissed
   * @description The operator chose to keep editing — closes the confirmation only, the panel stays open.
   * @access protected
   * @since 7.1.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }
  //#endregion
}
