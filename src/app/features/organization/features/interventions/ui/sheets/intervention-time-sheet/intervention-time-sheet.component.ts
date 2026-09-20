import { DatePipe } from '@angular/common';
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
import { type CallState } from '@core/request-state';
import type {
  InterventionTimeDraft,
  InterventionTimeEntryView,
  InterventionTimeWrite,
  InterventionWorkItemOutput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { InterventionTimeForm } from '../../forms/intervention-time-form';

/**
 * Component InterventionTimeSheet
 * @class InterventionTimeSheet
 *
 * @description
 * Contextual journal and explicit corrections, usable after publication. Draft persistence and transport remain owned by the page.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-intervention-time-sheet',
  templateUrl: './intervention-time-sheet.component.html',
  imports: [
    DatePipe,
    HlmSheetImports,
    HlmAlertImports,
    HlmAlertDialogImports,
    HlmButton,
    HlmBadge,
    HlmSkeleton,
    HlmEmptyImports,
    HlmCollapsibleImports,
    InterventionTimeForm,
    UnsavedChangesDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTimeSheet {
  /**
   * Property sheet
   * @readonly
   *
   * @description
   * Reopens the native sheet while unpersisted input awaits a decision.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<HlmSheet | undefined>}
   */
  private readonly sheet: Signal<HlmSheet | undefined> = viewChild(HlmSheet);

  /**
   * Property discardOnClose
   * @readonly
   *
   * @description
   * Requires explicit disposal if device storage failed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly discardOnClose: WritableSignal<boolean> = signal(false);

  /**
   * Property discardingDraft
   * @readonly
   *
   * @description
   * Explicit local draft discard.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly discardingDraft: WritableSignal<boolean> = signal(false);

  /**
   * Property reviewingDraft
   * @readonly
   *
   * @description
   * Explicit comparison before rebasing a correction.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly reviewingDraft: WritableSignal<boolean> = signal(false);

  /**
   * Property draftServerEntry
   * @readonly
   *
   * @description
   * Latest server version conflicting with the saved correction.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionTimeEntryView | null>}
   */
  protected readonly draftServerEntry: Signal<InterventionTimeEntryView | null> = computed(() => {
    const draft = this.draft();
    return draft?.baseRevision !== null
      ? (this.entries().find(
          (entry) =>
            entry.id === draft?.id && !entry.syncStatus && entry.revision !== draft.baseRevision,
        ) ?? null)
      : null;
  });

  /**
   * Property item
   * @readonly
   *
   * @description
   * Selected work item.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionWorkItemOutput>}
   */
  public readonly item: InputSignal<InterventionWorkItemOutput> =
    input.required<InterventionWorkItemOutput>();

  /**
   * Property actorId
   * @readonly
   *
   * @description
   * Current organization member.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly actorId: InputSignal<string> = input.required<string>();

  /**
   * Property today
   * @readonly
   *
   * @description
   * Organization-local current date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly today: InputSignal<string> = input.required<string>();

  /**
   * Property members
   * @readonly
   *
   * @description
   * Contributor display names.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Server history with pending local changes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionTimeEntryView[]>}
   */
  public readonly entries: InputSignal<readonly InterventionTimeEntryView[]> = input<
    readonly InterventionTimeEntryView[]
  >([]);

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Restorable input.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionTimeDraft | null>}
   */
  public readonly draft: InputSignal<InterventionTimeDraft | null> =
    input<InterventionTimeDraft | null>(null);

  /**
   * Property readState
   * @readonly
   *
   * @description
   * Journal request state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CallState>}
   */
  public readonly readState: InputSignal<CallState> = input.required<CallState>();

  /**
   * Property writeState
   * @readonly
   *
   * @description
   * Submission request state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CallState>}
   */
  public readonly writeState: InputSignal<CallState> = input.required<CallState>();

  /**
   * Property draftState
   * @readonly
   *
   * @description
   * Local persistence request state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CallState>}
   */
  public readonly draftState: InputSignal<CallState> = input.required<CallState>();

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Global load cannot be inferred offline.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly offline: InputSignal<boolean> = input(false);

  /**
   * Property historyUnavailable
   * @readonly
   *
   * @description
   * Distinguishes missing local history from an empty journal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly historyUnavailable: InputSignal<boolean> = input(false);

  /**
   * Property closed
   * @readonly
   *
   * @description
   * Dismissal retaining local drafts.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output();

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Explicit journal reload.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Reviewed time operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionTimeWrite>}
   */
  public readonly submitted: OutputEmitterRef<InterventionTimeWrite> = output();

  /**
   * Property draftChanged
   * @readonly
   *
   * @description
   * Durable input edits.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionTimeDraft>}
   */
  public readonly draftChanged: OutputEmitterRef<InterventionTimeDraft | null> = output();

  /**
   * Property editing
   * @readonly
   *
   * @description
   * Explicitly chosen form seed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionTimeDraft | null>}
   */
  protected readonly editing: WritableSignal<InterventionTimeDraft | null> = signal(null);

  /**
   * Property cancelling
   * @readonly
   *
   * @description
   * Entry awaiting cancellation confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionTimeEntryView | null>}
   */
  protected readonly cancelling: WritableSignal<InterventionTimeEntryView | null> = signal(null);

  /**
   * Property side
   * @readonly
   *
   * @description
   * Centralized adaptive surface.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Shared duration formatting.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Disables duplicate writes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly pending: Signal<boolean> = computed(
    () => this.writeState().status === 'pending',
  );

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Server-authorized journal capability.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed(
    () =>
      this.item().allowedActions?.canLogTime === true ||
      this.item().allowedActions?.canManageTime === true,
  );

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Returns to the journal only after a successful write, preserving drafts on errors.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    let wasPending = false;
    effect(() => {
      const state = this.writeState().status;
      if (wasPending && state === 'success') untracked(() => this.editing.set(null));
      wasPending = state === 'pending';
    });
  }

  /**
   * Method memberName
   * @method memberName
   *
   * @description
   * Resolves known names, retaining historic identifiers when absent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} id - Member identifier.
   * @returns {string}
   */
  protected memberName(id: string): string {
    return (
      this.members().find((member) => member.value.split('/').at(-1) === id)?.displayName ?? id
    );
  }

  /**
   * Method begin
   * @method begin
   *
   * @description
   * Restores an existing draft before starting another entry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected begin(): void {
    const draft = this.draft() ?? {
      id: crypto.randomUUID(),
      memberId: this.actorId(),
      workedOn: this.today(),
      minutes: '',
      note: '',
      baseRevision: null,
    };
    this.editing.set(draft);
  }

  /**
   * Method correct
   * @method correct
   *
   * @description
   * Starts a correction against the displayed revision without rebasing automatically.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionTimeEntryView} entry - Entry to correct.
   * @returns {void}
   */
  protected correct(entry: InterventionTimeEntryView): void {
    if (this.draft() && this.draft()?.id !== entry.id) return;
    this.editing.set(
      this.draft() ?? {
        id: entry.id,
        memberId: entry.memberId,
        workedOn: entry.workedOn,
        minutes: String(entry.minutes),
        note: entry.note ?? '',
        baseRevision: entry.revision,
      },
    );
  }

  /**
   * Method canCorrect
   * @method canCorrect
   *
   * @description
   * Never corrects another contributor without the dedicated capability.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionTimeEntryView} entry - Journal row.
   * @returns {boolean}
   */
  protected canCorrect(entry: InterventionTimeEntryView): boolean {
    return (
      !entry.cancelled &&
      !entry.syncStatus &&
      this.canWrite() &&
      (entry.memberId === this.actorId() || this.item().allowedActions?.canManageTime === true)
    );
  }

  /**
   * Method confirmCancellation
   * @method confirmCancellation
   *
   * @description
   * Cancels a versioned entry while retaining its audit history.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmCancellation(): void {
    const entry = this.cancelling();
    if (!entry || this.pending()) return;
    this.cancelling.set(null);
    this.submitted.emit({ kind: 'cancel', id: entry.id, revision: entry.revision });
  }

  /**
   * Method reviewCorrection
   * @method reviewCorrection
   *
   * @description
   * Adopts a new revision only after the user has compared server and draft values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reviewCorrection(): void {
    const draft = this.draft();
    const entry = this.draftServerEntry();
    if (!draft || !entry || entry.cancelled) return;
    const reviewed = { ...draft, baseRevision: entry.revision };
    this.draftChanged.emit(reviewed);
    this.editing.set(reviewed);
    this.reviewingDraft.set(false);
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * Keeps failed local drafts in memory until persisted or explicitly discarded.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.pending() || this.draftState().status === 'pending') return;
    if (this.draftState().status === 'error') {
      this.sheet()?.open();
      this.discardOnClose.set(true);
    } else this.closed.emit();
  }
}
