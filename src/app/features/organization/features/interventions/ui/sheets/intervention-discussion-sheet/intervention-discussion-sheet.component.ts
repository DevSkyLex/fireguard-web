import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
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
import { SubjectDiscussion } from '@features/organization/features/collaboration/ui/components';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';
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
 * unsent draft or a send still in flight both mark {@link dirty} and, on any
 * attempt to close, open the shared {@link UnsavedChangesDialog} instead of
 * closing outright — the same "discard or stay" question a create page asks
 * through `unsavedChangesGuard`, hosted directly here since a sheet has no
 * route to hang a `CanDeactivate` guard off.
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

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Clears {@link dirty} whenever the panel closes, so a draft abandoned once cannot make the next opening raise a confirmation over nothing.
   * @access public
   * @since 1.3.0
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
   * {@link SubjectDiscussion.dirtyChanged}. Gates {@link requestClose}.
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
   * Property injector
   * @readonly
   * @description Hands {@link requestClose} its `afterNextRender` context, since the method runs outside construction.
   * @access private
   * @since 1.3.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);
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
   * The panel's single closing gate — reached from the plain close button
   * and the local Escape binding alike. A dirty draft opens
   * {@link UnsavedChangesDialog} and defers to
   * {@link onUnsavedChangesConfirmed} / {@link onUnsavedChangesDismissed}.
   * A clean verdict is re-checked once after the next render before closing:
   * {@link dirty} arrives through child `effect`s that flush in the very
   * change-detection pass the closing keystroke schedules, so a keystroke
   * landing right after typing would otherwise read a stale `false` and
   * discard the draft it just created.
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

    afterNextRender(
      (): void => {
        if (this.dirty()) {
          this.unsavedChangesDialogState.set('open');

          return;
        }

        this.visibleChange.emit(false);
      },
      { injector: this.injector },
    );
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
