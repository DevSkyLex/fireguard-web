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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideClock } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InterventionPublicationSummary } from '../../components/intervention-publication-summary';

/**
 * Component InterventionPublishDialog
 * @class InterventionPublishDialog
 *
 * @description
 * The confirmation that gates publication (`DESIGN.md` "Action Surfaces" rule
 * 5 — every irreversible action confirms). It carries no form: the
 * confirmation *is* the recap, `app-intervention-publication-summary`
 * rendered inside it and fed the same signals as the rail's own publication
 * group, so the two cannot drift because there is only one summary
 * definition. `disableClose` stays bound to {@link publishing} — the dialog
 * is busy-locked (Escape and the backdrop both blocked) until the write
 * settles, on success or on failure.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store. The page
 * keeps the publish call, the timed-out recheck, and every read this dialog's
 * body needs.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-publish-dialog',
  imports: [
    NgIcon,
    HlmButton,
    ...HlmAlertImports,
    ...HlmAlertDialogImports,
    ...HlmSpinnerImports,
    InterventionPublicationSummary,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideClock })],
  templateUrl: './intervention-publish-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPublishDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the confirmation is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property intervention
   * @readonly
   * @description The intervention the recap is built from, or `null` before it has loaded.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionOutput | null>}
   */
  public readonly intervention: InputSignal<InterventionOutput | null> =
    input<InterventionOutput | null>(null);

  /**
   * Property pendingChangesCount
   * @readonly
   * @description How many proposed changes publication would apply.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly pendingChangesCount: InputSignal<number> = input<number>(0);

  /**
   * Property publishing
   * @readonly
   * @description Whether a publication request and its poll are running.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly publishing: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property publicationLongRunning
   * @readonly
   * @description Whether the current publish attempt has been pending long enough to say so.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly publicationLongRunning: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property publicationTimedOut
   * @readonly
   * @description Whether the last attempt ended because the poll gave up while the publication was still running server-side.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly publicationTimedOut: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property publicationError
   * @readonly
   * @description What the last publish attempt failed with, or `null` while {@link publicationTimedOut} is set.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly publicationError: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property dismissed
   * @readonly
   * @description The confirmation was closed without publishing — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();

  /**
   * Property confirmed
   * @readonly
   * @description Publish was accepted.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();

  /**
   * Property recheckRequested
   * @readonly
   * @description "Check again" was pressed while {@link publicationTimedOut} is set.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly recheckRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The dialog state, derived from {@link visible} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link visible}, so it
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
  //#endregion
}
