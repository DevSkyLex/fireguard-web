import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { SubjectDiscussion } from '@features/organization/features/collaboration/ui/components';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';

/**
 * Component InterventionDiscussionSheet
 * @class InterventionDiscussionSheet
 *
 * @description
 * The spartan sheet hosting {@link SubjectDiscussion} for one intervention.
 *
 * Purely presentational: it owns the panel and forwards `visible`/`visibleChange`;
 * the page keeps the orchestration (`ARCHITECTURE.md` §10.5). Its open state is
 * derived from `visible` rather than held locally, so the page stays the single
 * owner and the two cannot drift. `SubjectDiscussion` is embedded directly rather
 * than projected — it is collaboration's own published, self-sufficient widget
 * (it provides its own `MessageThreadStore`), so composing it here mirrors how
 * {@link InterventionWorkItemSheet} composes its form.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`)
 * instead of a right-hand panel, so the thread's own composer lands in the
 * thumb zone. Unlike the other three sheets, it holds no scroll region of its
 * own — `SubjectDiscussion`'s embedded thread is documented as the app's only
 * scroller — so its content takes a real height (`max-sm:h-[85svh]!`,
 * `!`-forced past `HlmSheetContent`'s own `data-[side=bottom]:h-auto`) rather
 * than one bounded by a max-height, which is what lets the thread's `flex-1
 * min-h-0` column claim it. Its surface is also forced to `bg-background!`:
 * `HlmSheetContent` is `bg-popover` by default, one shade lighter than
 * `bg-background` in dark mode, which read as a seam under the thread's own
 * `bg-background` composer footer.
 *
 * Guards {@link SubjectDiscussion.dirtyChanged} against silent loss: an
 * unsent draft or a send still in flight both mark `disableClose` and, on
 * any attempt to close, open the shared {@link UnsavedChangesDialog} instead
 * of closing outright — the same "discard or stay" question a create page
 * asks through `unsavedChangesGuard`, hosted directly here since a sheet has
 * no route to hang a `CanDeactivate` guard off. `disableClose` alone cannot
 * carry this: the underlying dialog ref snapshots it once, at the moment the
 * panel opens, and a draft is never dirty at that exact instant — the
 * composer has not been typed into yet. {@link onStateChanged} is therefore
 * the real enforcement: an Escape or outside-click closing attempt while
 * {@link dirty} reaches it as a `'closed'` state it did not ask for, and it
 * calls the sheet's own {@link sheetRef}`.open()` — which resolves to
 * `BrnDialogRef.reopen()`, a primitive the library exposes for exactly this
 * "undo an in-progress close" case — before raising the confirmation, so the
 * panel never actually disappears. The vendored close button is replaced
 * with a plain one (`hlm-sheet-content`'s `showCloseButton` set `false`)
 * because it calls the dialog ref's `close()` directly rather than going
 * through this same guarded path.
 *
 * @since 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-discussion-sheet',
  imports: [SubjectDiscussion, UnsavedChangesDialog, HlmButton, NgIcon, ...HlmSheetImports],
  providers: [provideIcons({ lucideX })],
  templateUrl: './intervention-discussion-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionDiscussionSheet {
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
   * Property organizationId
   * @readonly
   * @description The owning organization, bare UUID, forwarded to {@link SubjectDiscussion}.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property interventionId
   * @readonly
   * @description The discussed intervention's bare id, forwarded to {@link SubjectDiscussion}.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly interventionId: InputSignal<string> = input.required<string>();
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
   * {@link SubjectDiscussion.dirtyChanged}. Gates both {@link requestClose}
   * and the sheet's own `disableClose`.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   *
   * @description
   * Open state of the shared {@link UnsavedChangesDialog}, raised by
   * {@link requestClose} when {@link dirty} is true.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property sheetRef
   * @readonly
   *
   * @description
   * The panel directive itself, queried only so {@link onStateChanged} can
   * call `.open()` — which resolves to `reopen()` on a dialog ref still
   * mid-close — to undo an Escape/outside-click closing attempt made while
   * {@link dirty}.
   *
   * @access protected
   * @since 1.2.0
   *
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
   * Relays a dismissal, ignoring the echo of a change the page already made.
   * An Escape or outside-click attempt reaching here while {@link dirty} is
   * undone through {@link sheetRef} — see the class doc — and redirected to
   * the same confirmation {@link requestClose} raises.
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

    if (!isOpen && this.dirty()) {
      this.sheetRef()?.open();
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * The panel's own close action. Closes right away when nothing would be
   * lost; otherwise opens {@link UnsavedChangesDialog} and defers to
   * {@link onUnsavedChangesConfirmed} / {@link onUnsavedChangesDismissed}.
   *
   * @access protected
   * @since 1.2.0
   *
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
   * @method onUnsavedChangesConfirmed
   *
   * @description
   * The reader chose to discard the draft — closes both the confirmation
   * and the panel itself.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesDismissed
   * @method onUnsavedChangesDismissed
   *
   * @description
   * The reader chose to keep writing — closes the confirmation only, the
   * panel stays open.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }
  //#endregion
}
