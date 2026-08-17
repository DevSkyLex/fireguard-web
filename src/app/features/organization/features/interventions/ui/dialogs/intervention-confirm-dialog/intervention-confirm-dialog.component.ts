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
  InterventionConfirmAcceptedEvent,
  InterventionConfirmRequest,
} from '@features/organization/features/interventions/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmTextareaImports } from '@shared/ui/textarea';

/**
 * Component InterventionConfirmDialog
 * @class InterventionConfirmDialog
 *
 * @description
 * The text confirmation for the detail page's four destructive-or-noted
 * actions — abandon, delete the intervention, delete a prepared work item,
 * skip a work item — as one `hlm-alert-dialog` rather than four. `skipWorkItem`
 * is the only variant that collects anything, so the reason draft is this
 * dialog's own state; it resets whenever {@link request} changes.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes
 * its open state from {@link request} being non-null. The caller keeps every
 * write — `accepted` carries what was confirmed, with the typed reason on the
 * skip variant, and the caller decides what to dispatch. `disableClose` stays
 * bound to {@link busy} while that write is in flight.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-confirm-dialog',
  imports: [...HlmAlertDialogImports, ...HlmTextareaImports],
  templateUrl: './intervention-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionConfirmDialog {
  //#region Inputs
  /**
   * Property request
   * @readonly
   * @description What is pending confirmation, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionConfirmRequest | null>}
   */
  public readonly request: InputSignal<InterventionConfirmRequest | null> =
    input<InterventionConfirmRequest | null>(null);

  /**
   * Property busy
   * @readonly
   * @description Whether the caller's write for this confirmation is in flight, which disables accepting again.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property accepted
   * @readonly
   * @description The confirmed request, with the typed reason attached on the skip variant.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionConfirmAcceptedEvent>}
   */
  public readonly accepted: OutputEmitterRef<InterventionConfirmAcceptedEvent> =
    output<InterventionConfirmAcceptedEvent>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without accepting — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  constructor() {
    effect((): void => {
      this.request();

      untracked((): void => this.skipReasonDraft.set(''));
    });
  }
  //#endregion

  //#region Properties
  /** The reason typed into the skip variant, cleared whenever a new request opens. */
  protected readonly skipReasonDraft: WritableSignal<string> = signal<string>('');

  /** The dialog state, derived from {@link request} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.request() === null ? 'closed' : 'open',
  );

  /** The confirmation's heading. */
  protected readonly title: Signal<string> = computed<string>(() => {
    switch (this.request()?.kind) {
      case 'abandon':
        return $localize`:@@intervention.abandon.header:Abandon intervention`;
      case 'deleteIntervention':
        return $localize`:@@intervention.delete.header:Delete intervention`;
      case 'deleteWorkItem':
        return $localize`:@@intervention.deleteWi.headerOne:Delete work item`;
      default:
        return $localize`:@@intervention.wit.skipHeader:Skip work item`;
    }
  });

  /** The confirmation's body. */
  protected readonly description: Signal<string> = computed<string>(() => {
    switch (this.request()?.kind) {
      case 'abandon':
        return $localize`:@@intervention.abandon.message:Abandon this intervention? It leaves the active workflow and cannot be resumed.`;
      case 'deleteIntervention':
        return $localize`:@@intervention.delete.message:Delete this intervention? This cannot be undone.`;
      case 'deleteWorkItem':
        return $localize`:@@intervention.deleteWi.messageOne:Remove this prepared work item? This cannot be undone.`;
      default:
        return $localize`:@@intervention.wit.skipMessage:Say why this item is being skipped. The reason stays on the record.`;
    }
  });

  /** The accept button's label. */
  protected readonly acceptLabel: Signal<string> = computed<string>(() => {
    switch (this.request()?.kind) {
      case 'abandon':
        return $localize`:@@intervention.abandon.accept:Abandon`;
      case 'deleteWorkItem':
      case 'deleteIntervention':
        return $localize`:@@common.delete:Delete`;
      default:
        return $localize`:@@intervention.wit.skip:Skip`;
    }
  });

  /** Whether the confirmation may be accepted. */
  protected readonly canAccept: Signal<boolean> = computed<boolean>(
    () =>
      !this.busy() &&
      (this.request()?.kind !== 'skipWorkItem' || this.skipReasonDraft().trim().length > 0),
  );
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
   * Method accept
   *
   * @description
   * Emits {@link accepted} for the pending request, attaching the trimmed
   * skip reason on the skip variant.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected accept(): void {
    const request: InterventionConfirmRequest | null = this.request();
    if (request === null) return;

    if (request.kind === 'skipWorkItem') {
      this.accepted.emit({
        kind: 'skipWorkItem',
        workItem: request.workItem,
        reason: this.skipReasonDraft().trim(),
      });

      return;
    }

    this.accepted.emit(request);
  }

  /**
   * Method onSkipReasonInput
   * @description Updates the skip reason draft from the textarea.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The textarea's input event.
   * @returns {void}
   */
  protected onSkipReasonInput(event: Event): void {
    this.skipReasonDraft.set((event.target as HTMLTextAreaElement).value);
  }
  //#endregion
}
