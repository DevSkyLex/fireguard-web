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
import {
  form,
  FormField,
  max,
  min,
  maxLength,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  InterventionRecurrenceFrequency,
  InterventionRecurrenceFormValues,
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { interventionRecurrenceFrequencyLabel } from '@features/organization/features/interventions/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetFooter } from '@shared/ui/sheet';
import type { InterventionRecurrenceFormDraft } from './models';

/** Shortest and longest a recurrence's name may be. */
const NAME_MAX_LENGTH: number = 160;

/** Cadence multiplier bounds the backend accepts. */
const INTERVAL_MIN: number = 1;
const INTERVAL_MAX: number = 12;

/** Lead time bounds, in days, the backend accepts. */
const LEAD_TIME_MIN: number = 0;
const LEAD_TIME_MAX: number = 90;

/** The anchor-day-of-month past which the backend's own documented caveat applies: occurrences drift after a short month. */
const ANCHOR_DRIFT_DAY_THRESHOLD: number = 28;

/** Every cadence unit the frequency select offers. */
const FREQUENCY_VALUES: ReadonlyArray<InterventionRecurrenceFrequency> = [
  'weekly',
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
];

/** A blank draft. */
const EMPTY_VALUES: InterventionRecurrenceFormDraft = {
  name: '',
  templateId: '',
  site: null,
  responsible: null,
  frequency: 'monthly',
  interval: 1,
  anchorDate: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  leadTimeDays: 7,
  endAt: null,
};

/**
 * Component InterventionRecurrenceForm
 * @class InterventionRecurrenceForm
 *
 * @description
 * The create/edit form for a recurring intervention schedule, composed from
 * spartan's field primitives: one `hlm-field-group`, one `hlm-field` per
 * control, `hlm-field-error` for the messages.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the typed values — the hosting sheet or page calls
 * the store (`ARCHITECTURE.md` §10.4). {@link recurrence} being `null`
 * drives a create draft; a non-`null` value reseeds the model for an edit,
 * splitting the row's template IRI down to the bare id the template select
 * expects.
 *
 * Its own host fills the flex column its hosting sheet establishes: the
 * field group scrolls independently while the `hlm-sheet-footer` action row
 * stays pinned (`FEATURE.md` "sticky-footer contract").
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-recurrence-form',
  imports: [
    FormField,
    HlmButton,
    HlmInput,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    HlmSheetFooter,
  ],
  templateUrl: './intervention-recurrence-form.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRecurrenceForm {
  //#region Inputs
  /**
   * Property recurrence
   * @readonly
   *
   * @description
   * `null` opens a blank create draft; a recurrence opens the form seeded
   * from that row for editing.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionRecurrenceOutput | null>}
   */
  public readonly recurrence: InputSignal<InterventionRecurrenceOutput | null> =
    input<InterventionRecurrenceOutput | null>(null);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a create/update request is in flight, which locks the controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * The last create/update failure message, if any.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly serverError: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property templates
   * @readonly
   *
   * @description
   * The organization's intervention templates, offered by the template select.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionTemplateOutput[]>}
   */
  public readonly templates: InputSignal<readonly InterventionTemplateOutput[]> = input<
    readonly InterventionTemplateOutput[]
  >([]);

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * The organization's sites, for the site override.
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
   * The organization's members, for the responsible override.
   *
   * @access public
   * @since 1.0.0
   *
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
   *
   * @description
   * Emits the typed draft values once the form is valid. `recurrenceId` is
   * `null` on a create, the edited row's id on an edit.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionRecurrenceFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionRecurrenceFormValues> =
    output<InterventionRecurrenceFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The operator backed out without submitting.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Emits whenever the field tree's dirtiness changes.
   *
   * @access public
   * @since 1.0.0
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
   * Re-seeds {@link model} whenever {@link recurrence} changes — a blank
   * draft for a create, the row's values for an edit — and relays the field
   * tree's dirtiness through {@link dirtyChanged}. Both writes run
   * `untracked` since neither must re-trigger the effect it runs in.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const target: InterventionRecurrenceOutput | null = this.recurrence();

      untracked((): void => {
        if (target === null) {
          this.model.set(EMPTY_VALUES);
          return;
        }

        this.model.set({
          name: target.name,
          templateId: target.template.slice(target.template.lastIndexOf('/') + 1),
          site: target.site,
          responsible: target.responsible,
          frequency: target.frequency,
          interval: target.interval,
          anchorDate: new Date(target.anchorDate),
          timezone: target.timezone,
          leadTimeDays: target.leadTimeDays,
          endAt: target.endAt ? new Date(target.endAt) : null,
        });
      });
    });

    effect((): void => {
      const dirty: boolean = this.recurrenceForm().dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<InterventionRecurrenceFormDraft> =
    signal<InterventionRecurrenceFormDraft>(EMPTY_VALUES);

  /**
   * Property recurrenceForm
   * @readonly
   *
   * @description
   * The field tree and its rules.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<InterventionRecurrenceFormDraft>}
   */
  protected readonly recurrenceForm: FieldTree<InterventionRecurrenceFormDraft> = form(
    this.model,
    (path) => {
      required(path.name, {
        message: $localize`:@@intervention.recurrences.nameRequired:Give the recurrence a name`,
      });
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: $localize`:@@intervention.recurrences.nameLength:Use at most 160 characters.`,
      });
      required(path.templateId, {
        message: $localize`:@@intervention.recurrences.templateRequired:Choose a template`,
      });
      required(path.frequency, {
        message: $localize`:@@intervention.recurrences.frequencyRequired:Choose a cadence`,
      });
      min(path.interval, INTERVAL_MIN, {
        message: $localize`:@@intervention.recurrences.intervalRange:Use a value between 1 and 12.`,
      });
      max(path.interval, INTERVAL_MAX, {
        message: $localize`:@@intervention.recurrences.intervalRange:Use a value between 1 and 12.`,
      });
      required(path.anchorDate, {
        message: $localize`:@@intervention.recurrences.anchorRequired:Pick an anchor date`,
      });
      required(path.timezone, {
        message: $localize`:@@intervention.recurrences.timezoneRequired:Enter a timezone`,
      });
      min(path.leadTimeDays, LEAD_TIME_MIN, {
        message: $localize`:@@intervention.recurrences.leadTimeRange:Use a value between 0 and 90.`,
      });
      max(path.leadTimeDays, LEAD_TIME_MAX, {
        message: $localize`:@@intervention.recurrences.leadTimeRange:Use a value between 0 and 90.`,
      });
    },
  );

  /** Every cadence unit offered. */
  protected readonly frequencyValues: ReadonlyArray<InterventionRecurrenceFrequency> =
    FREQUENCY_VALUES;

  /** Whether the anchor-day drift hint should render — past the 28th, occurrences drift after a short month. */
  protected readonly anchorDriftHintVisible: Signal<boolean> = computed<boolean>(() => {
    const anchor: Date | null = this.model().anchorDate;

    return anchor !== null && anchor.getDate() > ANCHOR_DRIFT_DAY_THRESHOLD;
  });

  /** Names a cadence unit on the closed select trigger and its option rows. */
  protected readonly frequencyLabelOf: (frequency: InterventionRecurrenceFrequency) => string = (
    frequency: InterventionRecurrenceFrequency,
  ): string => interventionRecurrenceFrequencyLabel(frequency);

  /** Names a picked template on the closed select trigger. */
  protected readonly templateLabelOf: (value: string) => string = (value: string): string =>
    this.templates().find((template: InterventionTemplateOutput): boolean => template.id === value)
      ?.name ?? '';

  /** Names a picked site on the closed select trigger. */
  protected readonly siteLabelOf: (value: string) => string = (value: string): string =>
    this.siteOptions().find((option: SelectOption): boolean => option.value === value)?.label ?? '';

  /** Names a picked member on the closed combobox trigger. */
  protected readonly memberLabelOf: (value: string) => string = (value: string): string =>
    this.memberOptions().find((option: MemberSelectOption): boolean => option.value === value)
      ?.displayName ?? '';
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits
   * when the form is valid. `recurrenceId` comes from {@link recurrence} —
   * `null` on a create, the edited row's id on an edit.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.recurrenceForm().markAsTouched();

    if (this.recurrenceForm().invalid()) return;

    const draft: InterventionRecurrenceFormDraft = this.model();
    if (draft.anchorDate === null) return;

    this.submitted.emit({
      recurrenceId: this.recurrence()?.id ?? null,
      name: draft.name.trim(),
      templateId: draft.templateId,
      site: draft.site,
      responsible: draft.responsible,
      frequency: draft.frequency,
      interval: draft.interval,
      anchorDate: draft.anchorDate,
      timezone: draft.timezone.trim(),
      leadTimeDays: draft.leadTimeDays,
      endAt: draft.endAt,
    });
  }
  //#endregion
}
