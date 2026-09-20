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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import type { CallState } from '@core/request-state';
import type {
  CapacityOutput,
  CapacityWeekInput,
  CapacityExceptionInput,
} from '@features/organization/features/workload/models';
import type { CapacityCommand } from '@features/organization/features/workload/state';
import type { MemberSelectOption } from '@features/organization/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInputGroupAddon } from '@shared/ui/input-group';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { WorkloadCapacityForm } from '../../forms/workload-capacity-form';

/**
 * Component WorkloadCapacitySheet
 * @class WorkloadCapacitySheet
 *
 * @description
 * Presentational capacity editor with factual writes and dated history.
 * Requests remain page-owned. Dirty drafts block scope changes until saved or discarded.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-capacity-sheet',
  templateUrl: './workload-capacity-sheet.component.html',
  imports: [
    DatePipe,
    HlmSheetImports,
    HlmAlertDialogImports,
    HlmAlertImports,
    HlmComboboxImports,
    HlmCollapsibleImports,
    HlmToggleGroupImports,
    HlmSpinner,
    NgIcon,
    HlmFieldImports,
    HlmButton,
    HlmAvatarImports,
    HlmInputGroupAddon,
    HlmItemImports,
    HlmSkeleton,
    WorkloadCapacityForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideChevronDown })],
})
export class WorkloadCapacitySheet {
  /**
   * Property selectedMemberOption
   * @readonly
   *
   * @description
   * Organization identity of the selected member; the submitted identifier remains unchanged.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly selectedMemberOption: Signal<MemberSelectOption | null> = computed(
    () => this.members().find((member) => member.value === this.memberId()) ?? null,
  );

  /**
   * Property today
   * @readonly
   *
   * @description
   * Current date in the organization's timezone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly today: InputSignal<string> = input.required<string>();

  /**
   * Property firstDayOfWeek
   * @readonly
   *
   * @description
   * Organization weekday display order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly firstDayOfWeek: InputSignal<string> = input('monday');

  /**
   * Property initialWeek
   * @readonly
   *
   * @description
   * Effective member override takes precedence over the organization baseline.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly number[] | null>}
   */
  protected readonly initialWeek: Signal<readonly number[] | null> = computed(() => {
    const weeks = this.readState().data?.configuration.weeks ?? [];
    const effective = weeks
      .filter((week) => week.effectiveOn <= this.today())
      .toSorted((left, right) => right.effectiveOn.localeCompare(left.effectiveOn));
    const individual = this.memberId()
      ? effective.find((week) => week.scopeId === this.memberId())
      : undefined;
    return (
      (individual ?? effective.find((week) => week.scopeId === this.organizationId()))?.minutes ??
      null
    );
  });

  /**
   * Property inheritsOrganizationWeek
   * @readonly
   *
   * @description
   * Identifies individual drafts prefilled from the organization rather than an existing override.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly inheritsOrganizationWeek: Signal<boolean> = computed(
    () =>
      !!this.memberId() &&
      this.initialWeek() !== null &&
      !this.readState().data?.configuration.weeks.some(
        (week) => week.scopeId === this.memberId() && week.effectiveOn <= this.today(),
      ),
  );

  /**
   * Property capacityForm
   * @readonly
   *
   * @description
   * Resets local edits after confirmation without closing or refetching the sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<WorkloadCapacityForm | undefined>}
   */
  protected readonly capacityForm: Signal<WorkloadCapacityForm | undefined> =
    viewChild(WorkloadCapacityForm);

  /**
   * Property resetRequested
   * @readonly
   *
   * @description
   * Distinguishes resetting the current draft from closing the sheet in the discard dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly resetRequested: WritableSignal<boolean> = signal(false);

  /**
   * Property historyExpanded
   * @readonly
   *
   * @description
   * History is secondary to the active capacity edit.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly historyExpanded: WritableSignal<boolean> = signal(false);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization scope.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property members
   * @readonly
   *
   * @description
   * Authorized capacity subjects.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input.required();

  /**
   * Property initialMemberId
   * @readonly
   *
   * @description
   * Initially selected override.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly initialMemberId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property online
   * @readonly
   *
   * @description
   * Capacity changes require an online connection.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly online: InputSignal<boolean> = input(true);

  /**
   * Property readState
   * @readonly
   *
   * @description
   * Configuration request state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CallState<CapacityOutput>>}
   */
  public readonly readState: InputSignal<CallState<CapacityOutput>> = input.required();

  /**
   * Property writeState
   * @readonly
   *
   * @description
   * Factual mutation state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CallState>}
   */
  public readonly writeState: InputSignal<CallState> = input.required();

  /**
   * Property closed
   * @readonly
   *
   * @description
   * Requests dismissal after protecting edits.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output();

  /**
   * Property requested
   * @readonly
   *
   * @description
   * Requests scope history when selected.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly requested: OutputEmitterRef<string | null> = output();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated scoped capacity mutation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CapacityCommand>}
   */
  public readonly submitted: OutputEmitterRef<CapacityCommand> = output();

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Organization default or individual override.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly memberId: WritableSignal<string | null> = signal(null);

  /**
   * Property mode
   * @readonly
   *
   * @description
   * Editor workflow.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<'week' | 'exception'>}
   */
  protected readonly mode: WritableSignal<'week' | 'exception'> = signal('week');

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether leaving would discard input.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);

  /**
   * Property discardOpen
   * @readonly
   *
   * @description
   * Unsaved-change confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly discardOpen: WritableSignal<boolean> = signal(false);

  /**
   * Property cancelExceptionId
   * @readonly
   *
   * @description
   * Exception awaiting cancellation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly cancelExceptionId: WritableSignal<string | null> = signal(null);

  /**
   * Property side
   * @readonly
   *
   * @description
   * Central sheet placement.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property sheet
   * @readonly
   *
   * @description
   * Restores the sheet when dismissal is interrupted.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheet: Signal<HlmSheet | undefined> = viewChild(HlmSheet);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * A sent write cannot be cancelled by closing.
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
   * Property duration
   * @readonly
   *
   * @description
   * Readable durations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;

  /**
   * Property scopeLabel
   * @readonly
   *
   * @description
   * Individual scope name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(id: string) => string}
   */
  protected readonly scopeLabel: (id: string) => string = (id) =>
    this.members().find((member) => member.value === id)?.displayName ?? id;

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Requests history on scope change, never from a form.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const memberId = this.initialMemberId();
      untracked(() => this.memberId.set(memberId));
    });
    effect(() => {
      const memberId = this.memberId();
      untracked(() => this.requested.emit(memberId));
    });
  }

  /**
   * Method setScope
   * @method setScope
   *
   * @description
   * Changes subjects only when no edit would be discarded.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} memberId - Individual or organization default.
   * @returns {void}
   */
  protected setScope(memberId: string | null): void {
    if (this.dirty() || this.pending()) return;
    this.mode.set('week');
    this.memberId.set(memberId);
    this.historyExpanded.set(false);
  }

  /**
   * Method setMode
   * @method setMode
   *
   * @description
   * Changes capacity workflow only when no draft would be lost.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {unknown} value - Native single-choice toggle value.
   * @returns {void}
   */
  protected setMode(value: unknown): void {
    if (this.dirty() || this.pending() || (value !== 'week' && value !== 'exception')) return;
    this.mode.set(value);
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * Keeps the draft open until the user confirms disposal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.pending()) return;
    this.resetRequested.set(false);
    if (this.dirty()) {
      this.sheet()?.open();
      this.discardOpen.set(true);
    } else this.closed.emit();
  }

  /**
   * Method requestReset
   * @method requestReset
   *
   * @description
   * Offers a confirmed escape from a dirty scope or mode without discarding the entire sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestReset(): void {
    if (this.pending() || !this.dirty()) return;
    this.resetRequested.set(true);
    this.discardOpen.set(true);
  }

  /**
   * Method confirmDiscard
   * @method confirmDiscard
   *
   * @description
   * Applies only the confirmed local discard action; sent writes remain protected.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmDiscard(): void {
    if (this.pending()) return;
    this.discardOpen.set(false);
    if (this.resetRequested()) this.capacityForm()?.resetDraft();
    else this.closed.emit();
  }

  /**
   * Method saveWeek
   * @method saveWeek
   *
   * @description
   * Scopes a weekly version.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CapacityWeekInput} value - Effective-dated week.
   * @returns {void}
   */
  protected saveWeek(value: CapacityWeekInput): void {
    if (!this.online() || this.pending()) return;
    this.submitted.emit({
      kind: 'week',
      organizationId: this.organizationId(),
      memberId: this.memberId(),
      input: value,
    });
  }

  /**
   * Method saveException
   * @method saveException
   *
   * @description
   * Scopes an individual's availability exception.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CapacityExceptionInput} value - Reduced availability.
   * @returns {void}
   */
  protected saveException(value: CapacityExceptionInput): void {
    const memberId = this.memberId();
    if (!memberId || !this.online() || this.pending()) return;
    this.submitted.emit({
      kind: 'exception',
      organizationId: this.organizationId(),
      memberId,
      input: value,
    });
  }

  /**
   * Method confirmCancellation
   * @method confirmCancellation
   *
   * @description
   * Cancels only the explicitly confirmed exception.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmCancellation(): void {
    const memberId = this.memberId(),
      exceptionId = this.cancelExceptionId();
    if (!memberId || !exceptionId || !this.online() || this.pending()) return;
    this.cancelExceptionId.set(null);
    this.submitted.emit({
      kind: 'cancel',
      organizationId: this.organizationId(),
      memberId,
      exceptionId,
    });
  }
}
