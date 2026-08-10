import type { BooleanInput } from '@angular/cdk/coercion';
import { DatePipe } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  untracked,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type {
  InterventionEditState,
  InterventionEditTarget,
  InterventionLabelOutput,
  InterventionLabelSummary,
  InterventionOutput,
  InterventionPriority,
  MemberSelectOption,
  SelectOption,
  UpdateInterventionInput,
} from '@features/organization/features/interventions/models';
import { InplaceField } from '@shared/inplace-field';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmSelectImports } from '@shared/ui/select';
import { InterventionTag } from '../intervention-tag';

/**
 * Constant LABEL_PREVIEW_COUNT
 * @const LABEL_PREVIEW_COUNT
 * @description How many labels a card shows before folding the rest into a count.
 * @since 1.0.0
 * @type {number}
 */
const LABEL_PREVIEW_COUNT: number = 3;

/**
 * Constant PRIORITY_VALUES
 * @const PRIORITY_VALUES
 * @description The priority ladder, in the order the select offers it.
 * @since 1.0.0
 * @type {readonly InterventionPriority[]}
 */
const PRIORITY_VALUES: readonly InterventionPriority[] = ['low', 'normal', 'high', 'urgent'];

/**
 * Component InterventionPropertiesGrid
 * @class InterventionPropertiesGrid
 *
 * @description
 * The intervention's properties, each edited where it is displayed
 * (`ARCHITECTURE.md` §10.5) — separated by rhythm, not rules: `PRODUCT.md`'s
 * "hierarchy from rhythm, not boxes" over a divider list, so the sidebar's
 * only boxed surface stays the action box below it. Rows keep enough gap that
 * a wrapping row (labels, participants) does not run into its neighbour
 * without a line to hold it back.
 *
 * Two commit modes, chosen by the control rather than by taste: a value
 * picked in one gesture commits on that gesture, because a Save button after
 * choosing "Urgent" from four options is a click that means nothing.
 * Participants and labels are sets with no such moment, so they keep an
 * explicit Save.
 *
 * Nothing is dispatched for a value equal to the one already stored — every
 * accepted patch increments `revision`, which publication is pinned to.
 *
 * `plannedStartAt` and `dueAt` are one card: they are picked together and
 * sent in one patch, which §10.5 admits as "a small coherent group".
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-properties-grid',
  imports: [
    DatePipe,
    InplaceField,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmSelectImports,
  ],
  templateUrl: './intervention-properties-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPropertiesGrid {
  //#region Inputs
  /**
   * Property intervention
   * @readonly
   * @description The loaded intervention whose properties this grid edits.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Property siteOptions
   * @readonly
   * @description The organization's root facilities, as the site choices.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   * @description The organization's members, used for both responsible and participants.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property labelOptions
   * @readonly
   * @description The organization's intervention labels.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionLabelOutput[]>}
   */
  public readonly labelOptions: InputSignal<readonly InterventionLabelOutput[]> = input<
    readonly InterventionLabelOutput[]
  >([]);

  /**
   * Property canEditSchedule
   * @readonly
   *
   * @description
   * Whether the schedule group — priority, planned window, participants —
   * accepts a write. The backend keeps these editable through `planned`,
   * `in_progress` and `changes_requested`, so a delayed intervention is
   * rescheduled in place; past that the cards render as plain text.
   *
   * @access public
   * @since 4.3.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canEditSchedule: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canEditSite
   * @readonly
   *
   * @description
   * Whether the site accepts a write — draft only: it scopes the prepared work
   * items, so the backend freezes it once planned.
   *
   * @access public
   * @since 4.3.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canEditSite: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canEditResponsible
   * @readonly
   *
   * @description
   * Whether the responsible accepts a handover — draft and planned only: once
   * field work starts, that identity governs execution rights and is frozen.
   *
   * @access public
   * @since 4.3.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canEditResponsible: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canEditDetails
   * @readonly
   * @description Whether labels accept a write, which holds until a terminal status.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canEditDetails: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property editState
   * @readonly
   * @description Which field the page has open, writing, or showing a rejection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionEditState>}
   */
  public readonly editState: InputSignal<InterventionEditState> =
    input.required<InterventionEditState>();
  //#endregion

  //#region Outputs
  /**
   * Property detailsChanged
   * @readonly
   * @description A patch the page should send. Never emitted for an unchanged value.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateInterventionInput>}
   */
  public readonly detailsChanged: OutputEmitterRef<UpdateInterventionInput> =
    output<UpdateInterventionInput>();

  /**
   * Property editTargetChanged
   * @readonly
   * @description Asks the page to open or close an editor.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionEditTarget | null>}
   */
  public readonly editTargetChanged: OutputEmitterRef<InterventionEditTarget | null> =
    output<InterventionEditTarget | null>();
  //#endregion

  //#region Properties
  /**
   * Property priorityValues
   * @readonly
   * @description Exposed for the priority select.
   * @access protected
   * @since 1.0.0
   * @type {readonly InterventionPriority[]}
   */
  protected readonly priorityValues: readonly InterventionPriority[] = PRIORITY_VALUES;

  /**
   * Property participantsDraft
   * @readonly
   *
   * @description
   * The in-flight participant set, reseeded from the stored value each time
   * the field transitions to open — keyed on the `editState` input rather
   * than this component's own trigger, so a host opening the editor directly
   * still gets a fresh draft. The stored read is untracked: a workspace
   * refresh mid-edit must not wipe what the user has drafted.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string[]>}
   */
  protected readonly participantsDraft: WritableSignal<string[]> = linkedSignal<boolean, string[]>({
    source: () => this.editState().open === 'participants',
    computation: (open, previous) =>
      open && previous?.source !== true
        ? untracked(() => [...this.intervention().participants])
        : (previous?.value ?? []),
  });

  /**
   * Property labelsDraft
   * @readonly
   *
   * @description
   * The in-flight label set, reseeded on the field's open transition — same
   * contract as {@link participantsDraft}.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string[]>}
   */
  protected readonly labelsDraft: WritableSignal<string[]> = linkedSignal<boolean, string[]>({
    source: () => this.editState().open === 'labels',
    computation: (open, previous) =>
      open && previous?.source !== true
        ? untracked(() => [...this.storedLabelIds()])
        : (previous?.value ?? []),
  });

  /**
   * Property siteLabel
   * @readonly
   * @description The site's human name, resolved from its IRI.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly siteLabel: Signal<string | null> = computed<string | null>(() => {
    const site: string | null = this.intervention().site;

    return site === null
      ? null
      : (this.siteOptions().find((option) => option.value === site)?.label ?? site);
  });

  /**
   * Property responsibleOption
   * @readonly
   * @description The responsible member, resolved so the card can show a face.
   * @access protected
   * @since 1.0.0
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly responsibleOption: Signal<MemberSelectOption | null> =
    computed<MemberSelectOption | null>(() => this.memberOf(this.intervention().responsible));

  /**
   * Property participantOptions
   * @readonly
   * @description The participants, resolved from their IRIs and skipping any unknown one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly participantOptions: Signal<readonly MemberSelectOption[]> = computed<
    readonly MemberSelectOption[]
  >(() =>
    this.intervention()
      .participants.map((iri) => this.memberOf(iri))
      .filter((member): member is MemberSelectOption => member !== null),
  );

  /**
   * Property scheduleRange
   * @readonly
   *
   * @description
   * The planned window as the range picker's own shape, and `null` until both
   * ends exist — a half-open window is not a range the control can show.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<[Date, Date] | null>}
   */
  protected readonly scheduleRange: Signal<[Date, Date] | null> = computed<[Date, Date] | null>(
    () => {
      const { plannedStartAt, dueAt } = this.intervention();

      return plannedStartAt && dueAt ? [new Date(plannedStartAt), new Date(dueAt)] : null;
    },
  );

  /**
   * Property visibleLabels
   * @readonly
   * @description The labels a card shows before folding the rest into a count.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly InterventionLabelSummary[]>}
   */
  protected readonly visibleLabels: Signal<readonly InterventionLabelSummary[]> = computed<
    readonly InterventionLabelSummary[]
  >(() => this.intervention().labels.slice(0, LABEL_PREVIEW_COUNT));

  /**
   * Property hiddenLabelCount
   * @readonly
   * @description How many labels the preview is not showing.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly hiddenLabelCount: Signal<number> = computed<number>(() =>
    Math.max(0, this.intervention().labels.length - LABEL_PREVIEW_COUNT),
  );

  /**
   * Property canSaveParticipants
   * @readonly
   * @description Whether the drafted participant set differs from the stored one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSaveParticipants: Signal<boolean> = computed<boolean>(
    () => !this.sameSet(this.participantsDraft(), this.intervention().participants),
  );

  /**
   * Property canSaveLabels
   * @readonly
   * @description Whether the drafted label set differs from the stored one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSaveLabels: Signal<boolean> = computed<boolean>(
    () => !this.sameSet(this.labelsDraft(), this.storedLabelIds()),
  );

  /**
   * Property memberLabelOf
   * @readonly
   * @description Names a member IRI for the combobox trigger and its chips.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly memberLabelOf: (value: string) => string = (value) =>
    this.memberOf(value)?.displayName ??
    $localize`:@@intervention.list.unknownMember:Unknown member`;

  /**
   * Property siteLabelOf
   * @readonly
   * @description Names a site IRI for the combobox trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly siteLabelOf: (value: string) => string = (value) =>
    this.siteOptions().find((option) => option.value === value)?.label ?? value;

  /**
   * Property labelNameOf
   * @readonly
   * @description Names a label id for the combobox chips.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly labelNameOf: (value: string) => string = (value) =>
    this.labelOptions().find((option) => option.id === value)?.name ?? value;
  //#endregion

  //#region Methods
  /**
   * Method isEditing
   * @description Whether the page has this field open.
   * @access protected
   * @since 1.0.0
   * @param {InterventionEditTarget} target - The field in question.
   * @returns {boolean} True when it is the open one.
   */
  protected isEditing(target: InterventionEditTarget): boolean {
    return this.editState().open === target;
  }

  /**
   * Method isSaving
   * @description Whether this field's own write is in flight.
   * @access protected
   * @since 1.0.0
   * @param {InterventionEditTarget} target - The field in question.
   * @returns {boolean} True while its patch is pending.
   */
  protected isSaving(target: InterventionEditTarget): boolean {
    return this.editState().saving === target;
  }

  /**
   * Method errorFor
   * @description The rejection message attributed to this field, if any.
   * @access protected
   * @since 1.0.0
   * @param {InterventionEditTarget} target - The field in question.
   * @returns {string | null} Its failure message, or null.
   */
  protected errorFor(target: InterventionEditTarget): string | null {
    const state: InterventionEditState = this.editState();

    return state.failed === target ? state.failure : null;
  }

  /**
   * Method onEditing
   *
   * @description
   * Forwards an open/close request to the page, which owns which field is
   * open. The confirm-mode drafts reseed themselves on the `editState`
   * transition ({@link participantsDraft}), so opening through the page's
   * readiness list and opening here behave identically.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionEditTarget} target - The field being opened or closed.
   * @param {boolean} open - Whether it is being opened.
   *
   * @returns {void}
   */
  protected onEditing(target: InterventionEditTarget, open: boolean): void {
    this.editTargetChanged.emit(open ? target : null);
  }

  /**
   * Method pickPriority
   * @description Commits a picked priority, unless it is the one already stored.
   * @access protected
   * @since 1.0.0
   * @param {InterventionPriority} priority - The chosen priority.
   * @returns {void}
   */
  protected pickPriority(priority: InterventionPriority): void {
    if (priority === this.intervention().priority) return;

    this.detailsChanged.emit({ priority });
  }

  /**
   * Method pickSite
   * @description Commits a picked site, unless it is the one already stored.
   * @access protected
   * @since 1.0.0
   * @param {string | null} site - The chosen site IRI, or null to clear it.
   * @returns {void}
   */
  protected pickSite(site: string | null): void {
    const stored: string | null | undefined = this.intervention().site;
    if (site === stored || (site == null && stored == null)) return;

    this.detailsChanged.emit({ site });
  }

  /**
   * Method pickResponsible
   * @description Commits a picked responsible, unless it is the one already stored.
   * @access protected
   * @since 1.0.0
   * @param {string | null} responsible - The chosen member IRI, or null to clear it.
   * @returns {void}
   */
  protected pickResponsible(responsible: string | null): void {
    const stored: string | null | undefined = this.intervention().responsible;
    if (responsible === stored || (responsible == null && stored == null)) return;

    this.detailsChanged.emit({ responsible });
  }

  /**
   * Method pickSchedule
   *
   * @description
   * Commits the planned window. The picker emits once both ends are chosen, so
   * this never sends a half-open range.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {[Date, Date] | null} range - The chosen window, or null to clear it.
   *
   * @returns {void}
   */
  protected pickSchedule(range: [Date, Date] | null): void {
    const current: [Date, Date] | null = this.scheduleRange();
    const unchanged: boolean =
      range === null
        ? current === null
        : current !== null &&
          range[0].getTime() === current[0].getTime() &&
          range[1].getTime() === current[1].getTime();
    if (unchanged) return;

    this.detailsChanged.emit({
      plannedStartAt: range?.[0] ?? null,
      dueAt: range?.[1] ?? null,
    });
  }

  /**
   * Method saveParticipants
   * @description Emits the drafted participant set.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected saveParticipants(): void {
    this.detailsChanged.emit({ participants: [...this.participantsDraft()] });
  }

  /**
   * Method saveLabels
   *
   * @description
   * Emits the drafted label set. `labelIds` replaces the whole set rather than
   * adding to it, which is exactly what the editor produced.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected saveLabels(): void {
    this.detailsChanged.emit({ labelIds: [...this.labelsDraft()] });
  }

  /**
   * Method memberOf
   * @description Resolves a member IRI against the loaded options.
   * @access private
   * @since 1.0.0
   * @param {string | null} iri - The member IRI to resolve.
   * @returns {MemberSelectOption | null} The matching option, or null.
   */
  private memberOf(iri: string | null): MemberSelectOption | null {
    return iri === null
      ? null
      : (this.memberOptions().find((option) => option.value === iri) ?? null);
  }

  /**
   * Method storedLabelIds
   * @description The ids of the labels currently on the intervention.
   * @access private
   * @since 1.0.0
   * @returns {readonly string[]} The stored label ids.
   */
  private storedLabelIds(): readonly string[] {
    return this.intervention().labels.map((label) => label.id);
  }

  /**
   * Method sameSet
   *
   * @description
   * Whether two id collections hold the same members, order aside — the editor
   * returns them in selection order, the API in its own.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly string[]} left - One collection.
   * @param {readonly string[]} right - The other.
   *
   * @returns {boolean} True when both hold the same ids.
   */
  private sameSet(left: readonly string[], right: readonly string[]): boolean {
    if (left.length !== right.length) return false;

    const known: ReadonlySet<string> = new Set(right);

    return left.every((value) => known.has(value));
  }
  //#endregion
}
