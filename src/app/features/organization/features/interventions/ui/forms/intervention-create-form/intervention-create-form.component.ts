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
  maxLength,
  minLength,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import {
  resolveInterventionTag,
  type InterventionDuplicatePrefill,
  type InterventionPriority,
  type InterventionType,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetFooter } from '@shared/ui/sheet';
import { InterventionTag } from '../../components/intervention-tag';
import type { InterventionCreateFormDraft, InterventionCreateFormValues } from './models';

/** Shortest and longest an intervention name may be. */
const NAME_MIN_LENGTH: number = 2;
const NAME_MAX_LENGTH: number = 255;

/** The objectives an intervention can be opened for. */
const TYPE_VALUES: ReadonlyArray<InterventionType> = [
  'site_setup',
  'inventory',
  'inspection_campaign',
];

/** The priorities offered, ordered low to urgent. */
const PRIORITY_VALUES: ReadonlyArray<InterventionPriority> = ['low', 'normal', 'high', 'urgent'];

/** A blank draft. */
const EMPTY_VALUES: InterventionCreateFormDraft = {
  name: '',
  type: 'site_setup',
  priority: 'normal',
  site: '',
  responsible: '',
  plannedRange: null,
};

/**
 * Component InterventionCreateForm
 * @class InterventionCreateForm
 *
 * @description
 * The form that opens an intervention draft, composed from spartan's field
 * primitives: one `hlm-field-group`, one `hlm-field` per control, and
 * `hlm-field-error` for the messages.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the typed values — the page calls the store
 * (`ARCHITECTURE.md` §10.4). Errors surface only once a field has been
 * touched, so a blank form does not greet the user in red.
 *
 * Dates are date-only, picked together as one window through
 * `hlm-date-range-picker`, then split into `plannedStartAt`/`dueAt` on submit.
 *
 * {@link prefill} seeds the model for the "Duplicate" flow — never the planned
 * window, which stays blank even when duplicating a scheduled intervention.
 *
 * Its own host fills the flex column its hosting sheet establishes: the field
 * group scrolls independently while the `hlm-sheet-footer` action row stays
 * pinned, without the sheet needing to know about the form's internal layout.
 *
 * @version 4.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-form',
  imports: [
    FormField,
    HlmButton,
    HlmInput,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    HlmSheetFooter,
  ],
  templateUrl: './intervention-create-form.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreateForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a creation request is in flight, which locks the controls.
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
   * Whatever the store's create call failed with.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * The organization's sites.
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
   * The organization's members.
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
   * Property prefill
   * @readonly
   *
   * @description
   * Values to seed the draft with — the "Duplicate" entry point's payload.
   * `null` (the default) leaves the form blank. Changing it re-seeds the
   * model, and clearing it resets to blank; the sheet is what actually clears
   * it once it closes.
   *
   * @access public
   * @since 6.1.0
   *
   * @type {InputSignal<InterventionDuplicatePrefill | null>}
   */
  public readonly prefill: InputSignal<InterventionDuplicatePrefill | null> =
    input<InterventionDuplicatePrefill | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the typed draft values once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionCreateFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionCreateFormValues> =
    output<InterventionCreateFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The operator backed out without creating anything.
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
   * Emits whenever the field tree's dirtiness changes, so the hosting sheet
   * can confirm before an Escape or a backdrop tap discards the draft.
   *
   * @access public
   * @since 6.2.0
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
   * Re-seeds {@link model} whenever {@link prefill} changes: the duplicated
   * values merged onto a blank draft when set, and the blank draft again once
   * it clears — and relays the field tree's dirtiness through
   * {@link dirtyChanged}. Both writes run `untracked` since neither must
   * re-trigger the effect it runs in.
   *
   * @access public
   * @since 6.1.0
   */
  public constructor() {
    effect((): void => {
      const prefill: InterventionDuplicatePrefill | null = this.prefill();

      untracked((): void => {
        this.model.set(prefill ? { ...EMPTY_VALUES, ...prefill } : EMPTY_VALUES);
      });
    });

    effect((): void => {
      const dirty: boolean = this.createForm().dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<InterventionCreateFormDraft> =
    signal<InterventionCreateFormDraft>(EMPTY_VALUES);

  /**
   * Property createForm
   * @readonly
   *
   * @description
   * The field tree and its rules.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<InterventionCreateFormDraft>}
   */
  protected readonly createForm: FieldTree<InterventionCreateFormDraft> = form(
    this.model,
    (path) => {
      required(path.name, {
        message: $localize`:@@intervention.cf.nameRequired:Give the intervention a name`,
      });
      minLength(path.name, NAME_MIN_LENGTH, {
        message: $localize`:@@intervention.cf.nameLength:Use between 2 and 255 characters.`,
      });
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: $localize`:@@intervention.cf.nameLength:Use between 2 and 255 characters.`,
      });
    },
  );

  /** The objectives offered. */
  protected readonly typeValues: ReadonlyArray<InterventionType> = TYPE_VALUES;

  /** The priorities offered. */
  protected readonly priorityValues: ReadonlyArray<InterventionPriority> = PRIORITY_VALUES;

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Everything the API said about the rejected request, as flat lines shown
   * above the form. Routing a violation back to its field needs a Signal Forms
   * server-error convention this codebase has not established yet, and
   * swallowing the messages would be worse than grouping them.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [$localize`:@@intervention.cf.createFailed:The intervention could not be created.`];
  });

  /** Names a type on the closed select trigger. */
  protected readonly typeLabelOf: (value: InterventionType) => string = (
    value: InterventionType,
  ): string => resolveInterventionTag('type', value).label;

  /** Names a priority on the closed select trigger. */
  protected readonly priorityLabelOf: (value: InterventionPriority) => string = (
    value: InterventionPriority,
  ): string => resolveInterventionTag('priority', value).label;

  /** Names a picked site on the closed combobox trigger. */
  protected readonly siteLabelOf: (value: string) => string = (value: string): string =>
    this.siteOptions().find((option: SelectOption): boolean => option.value === value)?.label ?? '';

  /** Names a picked member on the closed combobox trigger. */
  protected readonly memberLabelOf: (value: string) => string = (value: string): string =>
    this.memberOptions().find((option: MemberSelectOption): boolean => option.value === value)
      ?.label ?? '';
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits when
   * the form is valid. Splits the picked `plannedRange` tuple back into the
   * `plannedStartAt`/`dueAt` pair the store expects.
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

    this.createForm().markAsTouched();

    if (this.createForm().invalid()) return;

    const draft: InterventionCreateFormDraft = this.model();
    const [plannedStartAt, dueAt]: readonly [Date | null, Date | null] = draft.plannedRange ?? [
      null,
      null,
    ];

    this.submitted.emit({
      name: draft.name,
      type: draft.type,
      priority: draft.priority,
      site: draft.site,
      responsible: draft.responsible,
      plannedStartAt,
      dueAt,
    });
  }
  //#endregion
}
