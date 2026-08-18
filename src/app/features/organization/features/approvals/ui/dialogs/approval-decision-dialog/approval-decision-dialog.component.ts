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
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { ApprovalDecisionTarget } from './models';

/**
 * Constant DECISION_NOTE_MAX_LENGTH
 * @description The backend's `Assert\Length(max: 2000)` bound on `decisionNote`, enforced client-side too.
 * @since 1.0.0
 */
const DECISION_NOTE_MAX_LENGTH: number = 2000;

/**
 * Component ApprovalDecisionDialog
 * @class ApprovalDecisionDialog
 *
 * @description
 * The confirm gate for deciding on a pending approval request — one
 * `hlm-alert-dialog` covering both Approve and Reject, distinguished by
 * {@link target}'s `mode`. The approve variant states plainly that
 * approving **executes** the gated action immediately, since the backend
 * runs it synchronously on a successful approve, never queued. The optional
 * decision-note textarea carries a character counter against the backend's
 * 2000-character bound, mirroring `InterventionConfirmDialog`'s skip-reason
 * textarea. The counter is an `hlm-field-description` inside the wrapping
 * `hlm-field`, which auto-registers it with `BrnFieldA11yService` so the
 * textarea's `aria-describedby` points at it without a manual attribute — a
 * static description, deliberately not `aria-live`, since the count is
 * read on focus rather than announced on every keystroke.
 *
 * Presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes its
 * open state from {@link target} being non-null. The caller keeps every
 * write — {@link decided} carries the trimmed note — and stays open on
 * failure, showing {@link errorText} inline, so the reader sees the outcome
 * exactly where they took the action (`organization/FEATURE.md`'s
 * mutating-confirm-dialog invariant).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-approval-decision-dialog
 *   [target]="decisionTarget()"
 *   [pending]="store.isDeciding()"
 *   [errorText]="store.decideErrorText()"
 *   (decided)="submitDecision($event)"
 *   (dismissed)="closeDecisionDialog()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-approval-decision-dialog',
  imports: [...HlmAlertDialogImports, ...HlmFieldImports, ...HlmTextareaImports],
  templateUrl: './approval-decision-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalDecisionDialog {
  //#region Inputs
  /**
   * Property target
   * @readonly
   * @description What is pending confirmation, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ApprovalDecisionTarget | null>}
   */
  public readonly target: InputSignal<ApprovalDecisionTarget | null> =
    input<ApprovalDecisionTarget | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether the decision is in flight, which disables the confirm action and blocks dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property errorText
   * @readonly
   * @description The last decision failure's specific, actionable copy, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly errorText: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property decided
   * @readonly
   * @description Emits the trimmed decision note (possibly empty) once the reader confirms.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly decided: OutputEmitterRef<string> = output<string>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without deciding — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  constructor() {
    effect((): void => {
      this.target();

      untracked((): void => this.noteDraft.set(''));
    });
  }
  //#endregion

  //#region Properties
  /** The note typed for this decision, cleared whenever a new target opens. */
  protected readonly noteDraft: WritableSignal<string> = signal<string>('');

  /** The backend's character bound, read by the template's counter. */
  protected readonly maxLength: number = DECISION_NOTE_MAX_LENGTH;

  /** The dialog state, derived from {@link target} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.target() === null ? 'closed' : 'open',
  );

  /** The confirmation's heading. */
  protected readonly title: Signal<string> = computed<string>(() =>
    this.target()?.mode === 'reject'
      ? $localize`:@@approvals.decide.rejectTitle:Reject approval request?`
      : $localize`:@@approvals.decide.approveTitle:Approve approval request?`,
  );

  /** The confirmation's body — the approve variant states plainly that the gated action executes immediately. */
  protected readonly description: Signal<string> = computed<string>(() =>
    this.target()?.mode === 'reject'
      ? $localize`:@@approvals.decide.rejectMessage:The gated action will never run. This cannot be undone.`
      : $localize`:@@approvals.decide.approveMessage:Approving executes the gated action immediately — it does not queue for later. This cannot be undone.`,
  );

  /** The confirm button's label. */
  protected readonly acceptLabel: Signal<string> = computed<string>(() =>
    this.target()?.mode === 'reject'
      ? $localize`:@@approvals.decide.rejectAccept:Reject`
      : $localize`:@@approvals.decide.approveAccept:Approve`,
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link target}, so it
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
   * Method onNoteInput
   * @description Updates the note draft from the textarea, clamped to {@link maxLength}.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The textarea's input event.
   * @returns {void}
   */
  protected onNoteInput(event: Event): void {
    this.noteDraft.set((event.target as HTMLTextAreaElement).value.slice(0, this.maxLength));
  }

  /**
   * Method accept
   * @description Emits {@link decided} with the trimmed note, unless a decision is already in flight.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected accept(): void {
    if (this.pending()) return;

    this.decided.emit(this.noteDraft().trim());
  }
  //#endregion
}
