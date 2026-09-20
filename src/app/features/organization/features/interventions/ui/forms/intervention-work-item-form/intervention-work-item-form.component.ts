import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { DateTime } from 'luxon';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { PlanningCatalogueRequest } from '@features/organization/features/interventions/models';
import type {
  PlanningCatalogueKind,
  PlanningCatalogueState,
} from '@features/organization/features/interventions/models';
import {
  resolveInterventionTag,
  type InterventionWorkItemAction,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import { WorkloadAssigneeIndicator } from '@features/organization/features/workload/ui/components/workload-assignee-indicator';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { serverMessagesOf } from '@shared/form-feedback';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { InterventionCatalogueStatus } from '../../components/intervention-catalogue-status';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarDays } from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { RequiredMarker } from '@shared/required-marker';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCalendarRange } from '@shared/ui/calendar';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDateRangePicker, HlmDatePickerTrigger } from '@shared/ui/date-picker';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetFooter } from '@shared/ui/sheet';
import { InterventionTag } from '../../components/intervention-tag';
import type { InterventionWorkItemFormValues } from './models';
import type { InterventionWorkItemFormDraft } from './models/intervention-work-item-form-draft.model';

import { HlmItemImports } from '@shared/ui/item';
/** The kinds of field work an item can record. */
const ACTION_VALUES: ReadonlyArray<InterventionWorkItemAction> = [
  'site_setup',
  'inventory',
  'inspection',
];

/**
 * Constant EMPTY_VALUES
 *
 * @description
 * A new task with unknown effort and no period override.
 *
 * @since 1.0.0
 * @type {InterventionWorkItemFormDraft}
 */
const EMPTY_VALUES: InterventionWorkItemFormDraft = {
  action: 'inventory',
  target: '',
  assignee: '',
  estimateHours: '',
  estimateMinutes: '',
  workPeriod: null,
};

/**
 * Component InterventionWorkItemForm
 * @class InterventionWorkItemForm
 *
 * @description
 * A task being added to an intervention's prepared scope.
 *
 * Only the action is required. A target and an assignee are genuinely optional
 * — the backend accepts an item without either, and a planner often knows what
 * kind of work is needed before knowing which equipment or which agent.
 *
 * Its own host fills the flex column its hosting sheet establishes: the field
 * group scrolls independently while the `hlm-sheet-footer` action row stays
 * pinned, without the sheet needing to know about the form's internal layout.
 * Duration parts are converted only on submission. Desktop uses a native range
 * picker; mobile stages the same range in a touch-sized calendar drawer.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-form',
  imports: [
    ...HlmInputGroupImports,
    ...HlmDrawerImports,
    HlmCalendarRange,
    HlmDateRangePicker,
    HlmDatePickerTrigger,
    NgIcon,
    WorkloadAssigneeIndicator,
    InterventionCatalogueStatus,
    ...HlmAvatarImports,
    ...HlmItemImports,
    RequiredMarker,
    FormField,
    HlmButton,
    InterventionTag,
    ...HlmComboboxImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    HlmSheetFooter,
  ],
  providers: [provideIcons({ lucideCalendarDays })],
  templateUrl: './intervention-work-item-form.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemForm {
  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active UI locale for readable calendar ranges.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property regional
   * @readonly
   *
   * @description
   * Organization timezone used when inherited bounds arrive as timestamps.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regional: RegionalFormattingPort = inject(REGIONAL_FORMATTING_PORT);

  /**
   * Property periodTrigger
   * @readonly
   *
   * @description
   * Current calendar trigger, used to retain focus when the reset action disappears.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly periodTrigger: Signal<ElementRef<HTMLElement> | undefined> = viewChild(
    'periodTrigger',
    { read: ElementRef },
  );

  /**
   * Property desktopCalendar
   * @readonly
   *
   * @description
   * Native picker whose uncommitted first selection is discarded when its popover closes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<HlmDateRangePicker<Date> | undefined>}
   */
  private readonly desktopCalendar: Signal<HlmDateRangePicker<Date> | undefined> = viewChild(
    HlmDateRangePicker<Date>,
  );

  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Centralized, hydration-safe choice of calendar presentation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

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
    () => this.memberOptions().find((member) => member.value === this.model().assignee) ?? null,
  );

  /**
   * Property workloadOrganizationId
   * @readonly
   *
   * @description
   * Organization used for optional assignment load.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly workloadOrganizationId: InputSignal<string> = input('');

  /**
   * Property workloadStartsOn
   * @readonly
   *
   * @description
   * Inherited intervention period start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workloadStartsOn: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property workloadEndsOn
   * @readonly
   *
   * @description
   * Inherited intervention period end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workloadEndsOn: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property catalogueSearched
   * @readonly
   * @description Requests remote options without replacing the draft.
   * @access public
   * @since 1.0.0
   */
  public readonly catalogueSearched = output<PlanningCatalogueRequest>();
  /**
   * Property catalogues
   * @readonly
   * @description Loaded coverage and failures by preparation source.
   * @access public
   * @since 1.0.0
   */
  public readonly catalogues = input<
    Partial<Record<PlanningCatalogueKind, PlanningCatalogueState>>
  >({});
  /**
   * Property catalogueRequested
   * @readonly
   * @description Requests another source page while preserving the form.
   * @access public
   * @since 1.0.0
   */
  public readonly catalogueRequested = output<PlanningCatalogueKind>();

  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the creation request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   * @description Whether the scope may still grow.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property targetOptions
   * @readonly
   * @description The facilities and equipment an item can point at.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   * @description The members an item can be assigned to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The validated item, with its optional fields trimmed.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionWorkItemFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionWorkItemFormValues> =
    output<InterventionWorkItemFormValues>();

  /**
   * Property cancelled
   * @readonly
   * @description The planner backed out.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Emits whenever the field tree's dirtiness changes, so the hosting sheet
   * can confirm before an Escape or a backdrop tap discards the draft.
   *
   * @access public
   * @since 7.1.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Relays the field tree's dirtiness through {@link dirtyChanged}, run
   * `untracked` so the emit does not re-trigger the effect it runs in.
   * An incomplete first desktop range must not appear selected after dismissal.
   *
   * @access public
   * @since 7.1.0
   */
  public constructor() {
    effect((): void => {
      const dirty: boolean = this.workItemForm().dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });

    effect((onCleanup): void => {
      const picker = this.desktopCalendar();
      if (!picker) return;
      const subscription = picker.popover().closed.subscribe(() => {
        if (!this.model().workPeriod && picker.hasDate()) picker.reset();
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
  //#endregion

  //#region Properties
  /**
   * Property actionValues
   * @readonly
   * @description Exposed for the action select.
   * @access protected
   * @since 1.0.0
   * @type {ReadonlyArray<InterventionWorkItemAction>}
   */
  protected readonly actionValues: ReadonlyArray<InterventionWorkItemAction> = ACTION_VALUES;

  /**
   * Property model
   * @readonly
   * @description The drafted item.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<InterventionWorkItemFormDraft>}
   */
  protected readonly model: WritableSignal<InterventionWorkItemFormDraft> =
    signal<InterventionWorkItemFormDraft>(EMPTY_VALUES);

  /**
   * Property minWorkDate
   * @readonly
   *
   * @description
   * Intervention start interpreted as a local calendar date, never a UTC instant.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Date | undefined>}
   */
  protected readonly minWorkDate: Signal<Date | undefined> = computed(() =>
    this.toCalendarDate(this.workloadStartsOn()),
  );

  /**
   * Property maxWorkDate
   * @readonly
   *
   * @description
   * Inclusive intervention end for both calendars and schema validation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Date | undefined>}
   */
  protected readonly maxWorkDate: Signal<Date | undefined> = computed(() =>
    this.toCalendarDate(this.workloadEndsOn()),
  );

  /**
   * Property formatWorkPeriod
   * @readonly
   *
   * @description
   * Formats date-only selections without timezone conversion, including a half-picked range.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(dates: [Date | null, Date | null]) => string}
   */
  protected readonly formatWorkPeriod: (dates: [Date | null, Date | null]) => string = (dates) =>
    dates
      .filter((date): date is Date => date !== null)
      .map((date) => formatDate(date, 'mediumDate', this.locale))
      .join(' – ');

  /**
   * Property inheritedPeriodLabel
   * @readonly
   *
   * @description
   * Names the concrete default period only when both intervention bounds are known.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly inheritedPeriodLabel: Signal<string | null> = computed(() => {
    const start = this.minWorkDate();
    const end = this.maxWorkDate();
    return start && end ? this.formatWorkPeriod([start, end]) : null;
  });

  /**
   * Property workStartsOn
   * @readonly
   *
   * @description
   * Committed date-only start used for assignment evaluation and the existing output contract.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly workStartsOn: Signal<string> = computed(() => {
    const date = this.model().workPeriod?.[0];
    return date ? formatDate(date, 'yyyy-MM-dd', 'en-US') : '';
  });

  /**
   * Property workEndsOn
   * @readonly
   *
   * @description
   * Committed date-only end; an absent override still inherits the intervention period.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly workEndsOn: Signal<string> = computed(() => {
    const date = this.model().workPeriod?.[1];
    return date ? formatDate(date, 'yyyy-MM-dd', 'en-US') : '';
  });

  /**
   * Property calendarState
   * @readonly
   *
   * @description
   * Mobile drawer visibility; canceling never commits a staged range.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<BrnOverlayState>}
   */
  protected readonly calendarState: WritableSignal<BrnOverlayState> = signal('closed');

  /**
   * Property calendarStart
   * @readonly
   *
   * @description
   * Uncommitted first day while the mobile calendar is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<Date | undefined>}
   */
  protected readonly calendarStart: WritableSignal<Date | undefined> = signal(undefined);

  /**
   * Property calendarEnd
   * @readonly
   *
   * @description
   * Uncommitted final day while the mobile calendar is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<Date | undefined>}
   */
  protected readonly calendarEnd: WritableSignal<Date | undefined> = signal(undefined);

  /**
   * Property calendarRangeComplete
   * @readonly
   *
   * @description
   * Enables mobile Apply only after selecting a complete, bounded period.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly calendarRangeComplete: Signal<boolean> = computed(() => {
    const start = this.calendarStart();
    const end = this.calendarEnd();
    const min = this.minWorkDate();
    const max = this.maxWorkDate();
    return !!start && !!end && start <= end && (!min || start >= min) && (!max || end <= max);
  });

  /**
   * Property workItemForm
   * @readonly
   *
   * @description
   * Optional duration parts and date range are validated without inventing unknown effort.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<InterventionWorkItemFormDraft>}
   */
  protected readonly workItemForm: FieldTree<InterventionWorkItemFormDraft> = form(
    this.model,
    (path) => {
      disabled(path, { when: () => this.pending() || this.disabled() });
      validate(path.estimateHours, ({ value }) =>
        value().trim() === '' ||
        (/^\d+$/.test(value().trim()) &&
          Number(value()) <= Math.floor((Number.MAX_SAFE_INTEGER - 59) / 60))
          ? null
          : {
              kind: 'hours',
              message: $localize`:@@intervention.wif.hoursInvalid:Enter a valid number of whole hours, or leave empty.`,
            },
      );
      validate(path.estimateMinutes, ({ value }) =>
        value().trim() === '' || (/^\d{1,2}$/.test(value().trim()) && Number(value()) <= 59)
          ? null
          : {
              kind: 'minutes',
              message: $localize`:@@intervention.wif.minutesInvalid:Enter whole minutes between 0 and 59.`,
            },
      );
      validate(path.workPeriod, ({ value }) => {
        const range = value();
        if (!range) return null;
        const [start, end] = range;
        const min = this.minWorkDate();
        const max = this.maxWorkDate();
        if (start <= end && (!min || start >= min) && (!max || end <= max)) return null;
        return {
          kind: 'period',
          message: $localize`:@@intervention.wif.periodInvalid:Choose a start and end date within the intervention period.`,
        };
      });
      required(path.action, {
        message: $localize`:@@intervention.wif.actionRequired:Choose what kind of work this item records.`,
      });
    },
  );

  /**
   * Property targetLabelOf
   * @readonly
   * @description Names a target IRI for the combobox trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly targetLabelOf: (value: string) => string = (value) =>
    this.targetOptions().find((option) => option.value === value)?.label ??
    $localize`:@@common.unknownTarget:Unknown target`;

  /**
   * Property memberLabelOf
   * @readonly
   * @description Names a member IRI for the combobox trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly memberLabelOf: (value: string) => string = (value) =>
    this.memberOptions().find((option) => option.value === value)?.displayName ??
    $localize`:@@common.unknownMember:Unknown member`;

  /**
   * Property actionLabelOf
   * @readonly
   * @description Names an action for the select's own value rendering.
   * @access protected
   * @since 1.0.0
   * @type {(value: InterventionWorkItemAction) => string}
   */
  protected readonly actionLabelOf: (value: InterventionWorkItemAction) => string = (value) =>
    resolveInterventionTag('workItemAction', value).label;

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Everything the API said about the rejected creation, as flat lines above
   * the fields — the same grouping the other forms use, for the same reason.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@intervention.workspace.workItemCreateFailed:The work item could not be created.`,
    ),
  );
  //#endregion

  //#region Methods
  /**
   * Method toCalendarDate
   * @method toCalendarDate
   *
   * @description
   * Converts an inherited timestamp or date to an organization-local day for the native calendar.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} value - Intervention bound, optionally including its offset.
   * @returns {Date | undefined} Calendar date without a browser-zone day shift.
   */
  private toCalendarDate(value: string | null): Date | undefined {
    if (!value) return undefined;
    const day = DateTime.fromISO(value, { zone: this.regional.regionalFormatting().timezone });
    return day.isValid ? new Date(day.year, day.month - 1, day.day) : undefined;
  }

  /**
   * Method changeCalendarState
   * @method changeCalendarState
   *
   * @description
   * Seeds mobile selection on opening and discards unapplied picks on dismissal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnOverlayState} state - Native drawer state.
   * @returns {void}
   */
  protected changeCalendarState(state: BrnOverlayState): void {
    if (state === 'open') {
      this.calendarStart.set(this.model().workPeriod?.[0]);
      this.calendarEnd.set(this.model().workPeriod?.[1]);
    }
    this.calendarState.set(state);
  }

  /**
   * Method applyCalendarRange
   * @method applyCalendarRange
   *
   * @description
   * Commits a complete mobile range to the same Signal Forms field used by the desktop picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected applyCalendarRange(): void {
    const start = this.calendarStart();
    const end = this.calendarEnd();
    if (!start || !end || !this.calendarRangeComplete() || this.pending() || this.disabled())
      return;
    this.workItemForm.workPeriod().value.set([start, end]);
    this.workItemForm.workPeriod().markAsDirty();
    this.workItemForm.workPeriod().markAsTouched();
    this.calendarState.set('closed');
  }

  /**
   * Method clearWorkPeriod
   * @method clearWorkPeriod
   *
   * @description
   * Removes the override without copying the intervention dates into the task.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearWorkPeriod(): void {
    if (this.pending() || this.disabled()) return;
    this.workItemForm.workPeriod().value.set(null);
    this.workItemForm.workPeriod().markAsDirty();
    this.workItemForm.workPeriod().markAsTouched();
    const trigger = this.periodTrigger()?.nativeElement;
    (trigger?.querySelector('button') ?? trigger)?.focus();
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates, then emits the item with its optional fields trimmed. The draft
   * is deliberately not reset: a rejected request must not wipe the planner's
   * input.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The form submission.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.workItemForm().markAsTouched();

    if (this.pending() || this.disabled()) return;
    if (this.workItemForm().invalid()) {
      this.workItemForm().errorSummary()[0]?.fieldTree().focusBoundControl();
      return;
    }

    const values: InterventionWorkItemFormDraft = this.model();
    const hours = values.estimateHours.trim();
    const minutes = values.estimateMinutes.trim();

    this.submitted.emit({
      action: values.action,
      target: values.target.trim(),
      assignee: values.assignee.trim(),
      estimatedMinutes:
        hours === '' && minutes === '' ? '' : String(Number(hours) * 60 + Number(minutes)),
      workStartsOn: this.workStartsOn(),
      workEndsOn: this.workEndsOn(),
    });
  }
  //#endregion
}
