import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  LOCALE_ID,
  output,
  signal,
  untracked,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideTimer,
} from '@ng-icons/lucide';
import type {
  PlanningCatalogueKind,
  PlanningCatalogueState,
  PlanningCatalogueRequest,
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
import { toUtcMidnight } from '@features/organization/features/interventions/utils';
import { InplaceField } from '@shared/inplace-field';
import { formatRelativeTime } from '@shared/relative-time';
import { HlmInputGroupAddon } from '@shared/ui/input-group';
import { InterventionCatalogueStatus } from '../intervention-catalogue-status';

import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmTextareaImports } from '@shared/ui/textarea';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { InterventionTag } from '../intervention-tag';

import { HlmItemImports } from '@shared/ui/item';

/**
 * Constant LABEL_PREVIEW_COUNT
 *
 * @description
 * How many labels the properties view shows before folding the rest into a count.
 *
 * @since 1.0.0
 *
 * @type {number}
 *
 * @constant LABEL_PREVIEW_COUNT
 */
const LABEL_PREVIEW_COUNT: number = 3;

/**
 * Constant PRIORITY_VALUES
 *
 * @description
 * The priority ladder, in the order the select offers it.
 *
 * @since 1.0.0
 *
 * @type {readonly InterventionPriority[]}
 *
 * @constant PRIORITY_VALUES
 */
const PRIORITY_VALUES: readonly InterventionPriority[] = ['low', 'normal', 'high', 'urgent'];

/**
 * Constant DESCRIPTION_MAX_LENGTH
 *
 * @description
 * The backend ceiling for an intervention description.
 */
const DESCRIPTION_MAX_LENGTH: number = 2000;

/**
 * Constant PARTICIPANT_PREVIEW_COUNT
 *
 * @description
 * How many participant avatars the group shows before folding the rest into a count.
 *
 * @since 1.3.0
 *
 * @type {number}
 *
 * @constant PARTICIPANT_PREVIEW_COUNT
 */
const PARTICIPANT_PREVIEW_COUNT: number = 4;

/**
 * Component InterventionPropertiesGrid
 * @class InterventionPropertiesGrid
 *
 * @description
 * The intervention's properties, each edited where it is displayed
 * (`ARCHITECTURE.md` §10.5). Only audit metadata (revision, created, updated)
 * sits behind a local Spartan collapsible — participants, labels and the
 * description read every time, since none of the three is something a
 * reviewer can afford to miss behind a toggle that resets closed on every
 * intervention. The reading order is identity (reference, type), lifecycle
 * and action context (status, priority), planning context (site,
 * responsible, planned window), context (participants, labels, description)
 * and finally, collapsed, audit metadata.
 * Both grids use this component's container width instead of viewport
 * breakpoints, keeping their values legible when the rail stacks.
 * Two commit modes, chosen by the control rather than by taste: a value
 * picked in one gesture commits on that gesture, because a Save button after
 * choosing "Urgent" from four options is a click that means nothing.
 * Participants and labels are sets with no such moment, so they keep an
 * explicit Save.
 * Nothing is dispatched for a value equal to the one already stored — every
 * accepted patch increments `revision`, which publication is pinned to.
 * `plannedStartAt` and `dueAt` are one scheduling field: they are picked together and
 * sent in one patch, which §10.5 admits as "a small coherent group". Its
 * urgency ({@link dueSchedule}) is computed once by the page against the
 * organization's timezone, never re-derived here, so it never disagrees with
 * the identity row showing the same intervention.
 * When the site is editable, its name opens the in-place picker. Once the
 * workflow freezes that field, the same name becomes the link to the facility
 * record. The conditional shapes avoid nesting an anchor inside
 * `InplaceField`'s button trigger while keeping the name itself actionable.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-properties-grid',
  imports: [
    HlmInputGroupAddon,
    NgIcon,
    InterventionCatalogueStatus,
    ...HlmAvatarImports,
    ...HlmItemImports,
    OrgDatePipe,
    RouterLink,
    HlmButton,
    ...HlmCollapsibleImports,
    InplaceField,
    InterventionTag,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmSelectImports,
    ...HlmTextareaImports,
    ...HlmTooltipImports,
  ],
  providers: [provideIcons({ lucideChevronDown, lucideChevronUp, lucideCircleAlert, lucideTimer })],
  templateUrl: './intervention-properties-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPropertiesGrid {
  /**
   * Property locale
   * @readonly
   *
   * @description
   * The application's active locale, for relative-time formatting.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property catalogues
   * @readonly
   *
   * @description
   * Independent request states and server coverage for preparation sources.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Partial<Record<PlanningCatalogueKind, PlanningCatalogueState>>>}
   */
  public readonly catalogues = input<
    Partial<Record<PlanningCatalogueKind, PlanningCatalogueState>>
  >({});

  /**
   * Property catalogueRequested
   * @readonly
   *
   * @description
   * Requests the next page or retry of a selection source.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<PlanningCatalogueKind>}
   */
  public readonly catalogueRequested = output<PlanningCatalogueKind>();

  /**
   * Property catalogueSearched
   * @readonly
   *
   * @description
   * Requests server search while preserving the active draft and selected labels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<PlanningCatalogueRequest>}
   */
  public readonly catalogueSearched = output<PlanningCatalogueRequest>();
  //#region Inputs
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * The loaded intervention whose properties this grid edits.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Property detailsExpanded
   * @readonly
   *
   * @description
   * Whether the audit metadata (revision, created, updated) is visible. The
   * disclosure is local UI state and resets when the page moves to a
   * different intervention, while a refresh of the same intervention keeps
   * the operator's choice. Participants, labels and the description no
   * longer sit behind this — they read every time, per the norm that a
   * value gating publication or the day's work may not hide behind a toggle.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly detailsExpanded: WritableSignal<boolean> = linkedSignal<string, boolean>({
    source: () => this.intervention().id,
    computation: () => false,
  });

  /**
   * Property descriptionExpanded
   * @readonly
   *
   * @description
   * Whether a long description reads past its 3-line clamp. Resets on intervention change like
   * {@link detailsExpanded}.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly descriptionExpanded: WritableSignal<boolean> = linkedSignal<string, boolean>({
    source: () => this.intervention().id,
    computation: () => false,
  });

  /**
   * Property descriptionOverflows
   * @readonly
   *
   * @description
   * Whether the stored description is long enough to warrant the clamp and its "Show more" toggle.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly descriptionOverflows: Signal<boolean> = computed<boolean>(
    () => (this.intervention().description ?? '').length > 220,
  );

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace owning the intervention, so the site row can link into the facility's own record.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * The organization's root facilities, as the site choices.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * The organization's members, used for both responsible and participants.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property labelOptions
   * @readonly
   *
   * @description
   * The organization's intervention labels.
   *
   * @access public
   * @since 1.0.0
   *
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
   * rescheduled in place; past that the fields render as plain text.
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
   *
   * @description
   * Whether labels accept a write, which holds until a terminal status.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canEditDetails: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canManageLabels
   * @readonly
   *
   * @description
   * Whether the "Manage labels…" trigger renders beside the labels editor —
   * gated on `organization.interventions.write`, the label catalog's own
   * backend permission (distinct from `canEditDetails`, which only governs
   * which labels **this** intervention carries).
   *
   * @access public
   * @since 1.8.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canManageLabels: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property editState
   * @readonly
   *
   * @description
   * Which field the page has open, writing, or showing a rejection.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionEditState>}
   */
  public readonly editState: InputSignal<InterventionEditState> =
    input.required<InterventionEditState>();

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, bound by the page. The default keeps the
   * component renderable with no context wired.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);

  /**
   * Property dueSchedule
   * @readonly
   *
   * @description
   * The due date's urgency, computed once by the page against the
   * organization's timezone and passed down rather than recomputed here, so
   * the identity row and this field never disagree on "today". `null` while
   * there is no due date or the intervention has reached a terminal status.
   *
   * @access public
   * @since 1.3.0
   *
   * @type {InputSignal<{ readonly overdue: boolean; readonly label: string } | null>}
   */
  public readonly dueSchedule: InputSignal<{
    readonly overdue: boolean;
    readonly label: string;
  } | null> = input<{ readonly overdue: boolean; readonly label: string } | null>(null);

  //#endregion

  //#region Outputs
  /**
   * Property detailsChanged
   * @readonly
   *
   * @description
   * A patch the page should send. Never emitted for an unchanged value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<UpdateInterventionInput>}
   */
  public readonly detailsChanged: OutputEmitterRef<UpdateInterventionInput> =
    output<UpdateInterventionInput>();

  /**
   * Property editTargetChanged
   * @readonly
   *
   * @description
   * Asks the page to open or close an editor.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionEditTarget | null>}
   */
  public readonly editTargetChanged: OutputEmitterRef<InterventionEditTarget | null> =
    output<InterventionEditTarget | null>();

  /**
   * Property manageLabelsRequested
   * @readonly
   *
   * @description
   * The "Manage labels…" trigger was activated.
   *
   * @access public
   * @since 1.8.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly manageLabelsRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property priorityValues
   * @readonly
   *
   * @description
   * Exposed for the priority select.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly InterventionPriority[]}
   */
  protected readonly priorityValues: readonly InterventionPriority[] = PRIORITY_VALUES;

  /**
   * Property descriptionMaxLength
   * @readonly
   *
   * @description
   * Exposed so the textarea enforces the backend ceiling natively.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly descriptionMaxLength: number = DESCRIPTION_MAX_LENGTH;

  /**
   * Property descriptionDraft
   * @readonly
   *
   * @description
   * The in-flight description, seeded when the field opens.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly descriptionDraft: WritableSignal<string> = signal<string>('');

  /**
   * Property canSaveDescription
   * @readonly
   *
   * @description
   * Whether the description draft is valid and differs from the stored value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSaveDescription: Signal<boolean> = computed<boolean>(() => {
    const draft: string = this.descriptionDraft().trim();

    return (
      draft.length <= DESCRIPTION_MAX_LENGTH && draft !== (this.intervention().description ?? '')
    );
  });

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
   *
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
   *
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
   *
   * @description
   * The site's human name, resolved from its IRI.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly siteLabel: Signal<string | null> = computed<string | null>(() => {
    const site: string | null | undefined = this.intervention().site;

    return site == null
      ? null
      : (this.siteOptions().find((option) => option.value === site)?.label ?? site);
  });

  /**
   * Property siteFacilityId
   * @readonly
   *
   * @description
   * The site's bare facility id, extracted from its IRI, so the read-only site name can link to its
   * facility record.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly siteFacilityId: Signal<string | null> = computed<string | null>(() => {
    const site: string | null | undefined = this.intervention().site;

    return site == null ? null : site.slice(site.lastIndexOf('/') + 1);
  });

  /**
   * Property responsibleOption
   * @readonly
   *
   * @description
   * The responsible member, resolved so the properties view can show a face.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly responsibleOption: Signal<MemberSelectOption | null> =
    computed<MemberSelectOption | null>(() => this.memberOf(this.intervention().responsible));

  /**
   * Property participantOptions
   * @readonly
   *
   * @description
   * The participants, resolved from their IRIs and skipping any unknown one.
   *
   * @access protected
   * @since 1.0.0
   *
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
   * Property visibleParticipants
   * @readonly
   *
   * @description
   * The participants the avatar group shows before folding the rest into a count.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly visibleParticipants: Signal<readonly MemberSelectOption[]> = computed<
    readonly MemberSelectOption[]
  >(() => this.participantOptions().slice(0, PARTICIPANT_PREVIEW_COUNT));

  /**
   * Property hiddenParticipantCount
   * @readonly
   *
   * @description
   * How many participants the avatar group is not showing.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<number>}
   */
  protected readonly hiddenParticipantCount: Signal<number> = computed<number>(() =>
    Math.max(0, this.participantOptions().length - PARTICIPANT_PREVIEW_COUNT),
  );

  /**
   * Property participantNamesLabel
   * @readonly
   *
   * @description
   * The full participant name list, read by assistive technology in place of the avatar group's
   * decorative initials.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<string>}
   */
  protected readonly participantNamesLabel: Signal<string> = computed<string>(() =>
    this.participantOptions()
      .map((member) => member.displayName)
      .join(', '),
  );

  /**
   * Property createdRelative
   * @readonly
   *
   * @description
   * When the intervention was created, as a relative label — the absolute instant reads in an
   * adjacent tooltip.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<string>}
   */
  protected readonly createdRelative: Signal<string> = computed<string>(() =>
    formatRelativeTime(this.intervention().createdAt, this.locale),
  );

  /**
   * Property updatedRelative
   * @readonly
   *
   * @description
   * When the intervention was last updated, as a relative label — the absolute instant reads in an
   * adjacent tooltip.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<string>}
   */
  protected readonly updatedRelative: Signal<string> = computed<string>(() =>
    formatRelativeTime(this.intervention().updatedAt, this.locale),
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
   *
   * @description
   * The labels the properties view shows before folding the rest into a count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionLabelSummary[]>}
   */
  protected readonly visibleLabels: Signal<readonly InterventionLabelSummary[]> = computed<
    readonly InterventionLabelSummary[]
  >(() => this.intervention().labels.slice(0, LABEL_PREVIEW_COUNT));

  /**
   * Property hiddenLabelCount
   * @readonly
   *
   * @description
   * How many labels the preview is not showing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly hiddenLabelCount: Signal<number> = computed<number>(() =>
    Math.max(0, this.intervention().labels.length - LABEL_PREVIEW_COUNT),
  );

  /**
   * Property canSaveParticipants
   * @readonly
   *
   * @description
   * Whether the drafted participant set differs from the stored one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSaveParticipants: Signal<boolean> = computed<boolean>(
    () => !this.sameSet(this.participantsDraft(), this.intervention().participants),
  );

  /**
   * Property canSaveLabels
   * @readonly
   *
   * @description
   * Whether the drafted label set differs from the stored one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSaveLabels: Signal<boolean> = computed<boolean>(
    () => !this.sameSet(this.labelsDraft(), this.storedLabelIds()),
  );

  /**
   * Property memberLabelOf
   * @readonly
   *
   * @description
   * Names a member IRI for the combobox trigger and its chips.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   */
  protected readonly memberLabelOf: (value: string) => string = (value) =>
    this.memberOf(value)?.displayName ??
    $localize`:@@intervention.list.unknownMember:Unknown member`;

  /**
   * Property siteLabelOf
   * @readonly
   *
   * @description
   * Names a site IRI for the combobox trigger.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   */
  protected readonly siteLabelOf: (value: string) => string = (value) =>
    this.siteOptions().find((option) => option.value === value)?.label ??
    $localize`:@@common.unknownSite:Unknown site`;

  /**
   * Property labelNameOf
   * @readonly
   *
   * @description
   * Names a label id for the combobox chips.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   */
  protected readonly labelNameOf: (value: string) => string = (value) =>
    this.labelOptions().find((option) => option.id === value)?.name ??
    $localize`:@@common.unknownLabel:Unknown label`;
  //#endregion

  //#region Methods
  /**
   * Method isEditing
   * @method isEditing
   *
   * @description
   * Whether the page has this field open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionEditTarget} target - The field in question.
   *
   * @returns {boolean} True when it is the open one.
   */
  protected isEditing(target: InterventionEditTarget): boolean {
    return this.editState().open === target;
  }

  /**
   * Method isSaving
   * @method isSaving
   *
   * @description
   * Whether this field's own write is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionEditTarget} target - The field in question.
   *
   * @returns {boolean} True while its patch is pending.
   */
  protected isSaving(target: InterventionEditTarget): boolean {
    return this.editState().saving === target;
  }

  /**
   * Method errorFor
   * @method errorFor
   *
   * @description
   * The rejection message attributed to this field, if any.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionEditTarget} target - The field in question.
   *
   * @returns {string | null} Its failure message, or null.
   */
  protected errorFor(target: InterventionEditTarget): string | null {
    const state: InterventionEditState = this.editState();

    return state.failed === target ? state.failure : null;
  }

  /**
   * Method onEditing
   * @method onEditing
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
   * Method onDescriptionEditing
   * @method onDescriptionEditing
   *
   * @description
   * Seeds the description draft on open and forwards the page-owned edit state change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {boolean} open - Whether the description field is being opened.
   *
   * @returns {void}
   */
  protected onDescriptionEditing(open: boolean): void {
    if (open) this.descriptionDraft.set(this.intervention().description ?? '');

    this.editTargetChanged.emit(open ? 'description' : null);
  }

  /**
   * Method onDescriptionInput
   * @method onDescriptionInput
   *
   * @description
   * Keeps the description draft typed at the DOM boundary.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The textarea input event.
   *
   * @returns {void}
   */
  protected onDescriptionInput(event: Event): void {
    const target: EventTarget | null = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;

    this.descriptionDraft.set(target.value);
  }

  /**
   * Method saveDescription
   * @method saveDescription
   *
   * @description
   * Emits a trimmed description, using null for an intentionally empty value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected saveDescription(): void {
    const draft: string = this.descriptionDraft().trim();

    this.detailsChanged.emit({ description: draft === '' ? null : draft });
  }

  /**
   * Method pickPriority
   * @method pickPriority
   *
   * @description
   * Commits a picked priority, unless it is the one already stored.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionPriority} priority - The chosen priority.
   *
   * @returns {void}
   */
  protected pickPriority(priority: InterventionPriority): void {
    if (priority === this.intervention().priority) return;

    this.detailsChanged.emit({ priority });
  }

  /**
   * Method pickSite
   * @method pickSite
   *
   * @description
   * Commits a picked site, unless it is the one already stored.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} site - The chosen site IRI, or null to clear it.
   *
   * @returns {void}
   */
  protected pickSite(site: string | null): void {
    const stored: string | null | undefined = this.intervention().site;
    if (site === stored || (site == null && stored == null)) return;

    this.detailsChanged.emit({ site });
  }

  /**
   * Method pickResponsible
   * @method pickResponsible
   *
   * @description
   * Commits a picked responsible, unless it is the one already stored.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} responsible - The chosen member IRI, or null to clear it.
   *
   * @returns {void}
   */
  protected pickResponsible(responsible: string | null): void {
    const stored: string | null | undefined = this.intervention().responsible;
    if (responsible === stored || (responsible == null && stored == null)) return;

    this.detailsChanged.emit({ responsible });
  }

  /**
   * Method pickSchedule
   * @method pickSchedule
   *
   * @description
   * Commits the planned window. The picker emits once both ends are chosen, so
   * this never sends a half-open range. Each end is re-anchored to midnight
   * UTC ({@link toUtcMidnight}): the picker builds local-midnight dates whose
   * serialized instant would drift into the previous UTC day for any timezone
   * ahead of UTC.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {[Date, Date] | null} range - The chosen window, or null to clear it.
   *
   * @returns {void}
   */
  protected pickSchedule(range: [Date, Date] | null): void {
    const normalized: [Date, Date] | null =
      range === null ? null : [toUtcMidnight(range[0]), toUtcMidnight(range[1])];
    const current: [Date, Date] | null = this.scheduleRange();
    const unchanged: boolean =
      normalized === null
        ? current === null
        : current !== null &&
          normalized[0].getTime() === current[0].getTime() &&
          normalized[1].getTime() === current[1].getTime();
    if (unchanged) return;

    this.detailsChanged.emit({
      plannedStartAt: normalized?.[0] ?? null,
      dueAt: normalized?.[1] ?? null,
    });
  }

  /**
   * Method saveParticipants
   * @method saveParticipants
   *
   * @description
   * Emits the drafted participant set.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected saveParticipants(): void {
    this.detailsChanged.emit({ participants: [...this.participantsDraft()] });
  }

  /**
   * Method saveLabels
   * @method saveLabels
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
   * @method memberOf
   *
   * @description
   * Resolves a member IRI against the loaded organization identities.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} iri - The member IRI to resolve.
   *
   * @returns {MemberSelectOption | null} The matching option, or null.
   */
  protected memberOf(iri: string | null | undefined): MemberSelectOption | null {
    return iri == null
      ? null
      : (this.memberOptions().find((option) => option.value === iri) ?? null);
  }

  /**
   * Method storedLabelIds
   * @method storedLabelIds
   *
   * @description
   * The ids of the labels currently on the intervention.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {readonly string[]} The stored label ids.
   */
  private storedLabelIds(): readonly string[] {
    return this.intervention().labels.map((label) => label.id);
  }

  /**
   * Method sameSet
   * @method sameSet
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
