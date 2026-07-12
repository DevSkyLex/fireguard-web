import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { debounceTime } from 'rxjs';
import type {
  InterventionOutput,
  InterventionPriority,
  InterventionWorkItemOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { resolveInterventionTag } from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '../intervention-member-option/intervention-member-option.component';
import { InterventionOption } from '../intervention-option';
import type { InterventionPlanningGuideStep, InterventionPlanningGuideValues } from './models';

/**
 * Ordered guided-planning steps.
 */
const STEP_ORDER: readonly InterventionPlanningGuideStep[] = [
  'context',
  'scope',
  'team',
  'schedule',
];

/**
 * Component InterventionPlanningGuide
 * @class InterventionPlanningGuide
 *
 * @description
 * Presentational step-by-step preparation surface for a draft intervention:
 * context (name, description), scope (site, work items), team (responsible,
 * participants) and schedule (dates, priority). One step renders at a time;
 * leaving a step emits only its edited fields through {@link stepSaved} so
 * the parent merge-patches incrementally. Step completion reflects the
 * persisted intervention, not the draft controls.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-planning-guide',
  imports: [
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    InterventionMemberOption,
    InterventionOption,
    MessageModule,
    MultiSelectModule,
    ReactiveFormsModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './intervention-planning-guide.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPlanningGuide {
  //#region Inputs
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Draft intervention being prepared; seeds the step controls and drives
   * step completion.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * Available site options for the scope step.
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
   * Available member options for the team step.
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
   * Property workItems
   * @readonly
   *
   * @description
   * Prepared work items listed in the scope step.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> = input<
    readonly InterventionWorkItemOutput[]
  >([]);

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Whether a workspace save is in flight; disables the step controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether planning is forbidden (insufficient permissions); the guide
   * stays readable but every control and action is disabled.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canRemoveWorkItems
   * @readonly
   *
   * @description
   * Whether the scope step exposes per-item delete affordances.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canRemoveWorkItems: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property stepSaved
   * @readonly
   *
   * @description
   * Emits the fields edited on a step (merge-patch payload) when the user
   * leaves it with valid changes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionPlanningGuideValues>}
   */
  public readonly stepSaved: OutputEmitterRef<InterventionPlanningGuideValues> =
    output<InterventionPlanningGuideValues>();

  /**
   * Property addWorkItemRequested
   * @readonly
   *
   * @description
   * Emits when the scope step asks the parent to open the work-item drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly addWorkItemRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property removeWorkItemRequested
   * @readonly
   *
   * @description
   * Emits a work item whose deletion the user requested from the scope step.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionWorkItemOutput>}
   */
  public readonly removeWorkItemRequested: OutputEmitterRef<InterventionWorkItemOutput> =
    output<InterventionWorkItemOutput>();

  /**
   * Property planRequested
   * @readonly
   *
   * @description
   * Emits when the final step's "Plan intervention" action is invoked with
   * every step complete.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly planRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Form controls
  /**
   * Property nameControl
   * @readonly
   *
   * @description
   * Context step: intervention name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly nameControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  /**
   * Property descriptionControl
   * @readonly
   *
   * @description
   * Context step: free-text description.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly descriptionControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property siteControl
   * @readonly
   *
   * @description
   * Scope step: intervention site IRI.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string | null>}
   */
  protected readonly siteControl: FormControl<string | null> = new FormControl<string | null>(
    null,
    [Validators.required],
  );

  /**
   * Property responsibleControl
   * @readonly
   *
   * @description
   * Team step: responsible member IRI.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string | null>}
   */
  protected readonly responsibleControl: FormControl<string | null> = new FormControl<
    string | null
  >(null, [Validators.required]);

  /**
   * Property participantsControl
   * @readonly
   *
   * @description
   * Team step: participant member IRIs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<readonly string[]>}
   */
  protected readonly participantsControl: FormControl<readonly string[]> = new FormControl<
    readonly string[]
  >([], { nonNullable: true });

  /**
   * Property priorityControl
   * @readonly
   *
   * @description
   * Schedule step: intervention priority.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<InterventionPriority>}
   */
  protected readonly priorityControl: FormControl<InterventionPriority> =
    new FormControl<InterventionPriority>('normal', { nonNullable: true });

  /**
   * Property plannedStartAtControl
   * @readonly
   *
   * @description
   * Schedule step: planned start date-time.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<Date | null>}
   */
  protected readonly plannedStartAtControl: FormControl<Date | null> = new FormControl<Date | null>(
    null,
    [Validators.required],
  );

  /**
   * Property dueAtControl
   * @readonly
   *
   * @description
   * Schedule step: due date-time.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<Date | null>}
   */
  protected readonly dueAtControl: FormControl<Date | null> = new FormControl<Date | null>(null, [
    Validators.required,
    (control: AbstractControl): ValidationErrors | null => this.dueAfterStart(control),
  ]);

  /**
   * Property lastSeededId
   *
   * @description
   * Id of the intervention the controls were last seeded from, so a refresh
   * of the same intervention preserves in-progress edits while a different
   * intervention (prev/next navigation) reseeds everything.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {string | null}
   */
  private lastSeededId: string | null = null;
  //#endregion

  //#region Step state
  /**
   * Property activeStep
   * @readonly
   *
   * @description
   * Currently rendered step; resets to the first incomplete step whenever a
   * different intervention loads, while user navigation overrides it in
   * between.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionPlanningGuideStep>}
   */
  protected readonly activeStep: WritableSignal<InterventionPlanningGuideStep> = linkedSignal<
    string,
    InterventionPlanningGuideStep
  >({
    source: () => this.intervention().id,
    computation: () => untracked(() => this.firstIncompleteStep(this.intervention())),
  });

  /**
   * Property completion
   * @readonly
   *
   * @description
   * Per-step completion derived from the persisted intervention: context is
   * complete once named (always, post-creation), scope once a site is set,
   * team once a responsible is assigned, schedule once both dates are set.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Readonly<Record<InterventionPlanningGuideStep, boolean>>>}
   */
  protected readonly completion: Signal<Readonly<Record<InterventionPlanningGuideStep, boolean>>> =
    computed(() => {
      const intervention: InterventionOutput = this.intervention();
      return {
        context: intervention.name.length > 0,
        scope: !!intervention.site,
        team: !!intervention.responsible,
        schedule: !!intervention.plannedStartAt && !!intervention.dueAt,
      };
    });

  /**
   * Property allComplete
   * @readonly
   *
   * @description
   * Whether every step is complete, enabling the final plan action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly allComplete: Signal<boolean> = computed<boolean>(() =>
    STEP_ORDER.every((step: InterventionPlanningGuideStep): boolean => this.completion()[step]),
  );

  /**
   * Property steps
   * @readonly
   *
   * @description
   * Static step metadata (identifier, label, hint) rendered by the rail.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly { id: InterventionPlanningGuideStep; label: string; hint: string }[]}
   */
  protected readonly steps: readonly {
    readonly id: InterventionPlanningGuideStep;
    readonly label: string;
    readonly hint: string;
  }[] = [
    {
      id: 'context',
      label: $localize`:@@intervention.guide.stepContext:Context`,
      hint: $localize`:@@intervention.guide.stepContextHint:Name and description`,
    },
    {
      id: 'scope',
      label: $localize`:@@intervention.guide.stepScope:Scope`,
      hint: $localize`:@@intervention.guide.stepScopeHint:Site and work items`,
    },
    {
      id: 'team',
      label: $localize`:@@intervention.guide.stepTeam:Team`,
      hint: $localize`:@@intervention.guide.stepTeamHint:Responsible and participants`,
    },
    {
      id: 'schedule',
      label: $localize`:@@intervention.guide.stepSchedule:Schedule`,
      hint: $localize`:@@intervention.guide.stepScheduleHint:Dates and priority`,
    },
  ];

  /**
   * Property priorityOptions
   * @readonly
   *
   * @description
   * Static intervention priority choices for the schedule step's select.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SelectOption<InterventionPriority>[]}
   */
  protected readonly priorityOptions: readonly SelectOption<InterventionPriority>[] = [
    { label: $localize`:@@interventionPriority.low:Low`, value: 'low' },
    { label: $localize`:@@interventionPriority.normal:Normal`, value: 'normal' },
    { label: $localize`:@@interventionPriority.high:High`, value: 'high' },
    { label: $localize`:@@interventionPriority.urgent:Urgent`, value: 'urgent' },
  ];

  /**
   * Property isFirstStep
   * @readonly
   *
   * @description
   * Whether the active step is the first one, hiding the back affordance.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isFirstStep: Signal<boolean> = computed<boolean>(
    () => STEP_ORDER.indexOf(this.activeStep()) === 0,
  );

  /**
   * Property isLastStep
   * @readonly
   *
   * @description
   * Whether the active step is the last one, swapping Continue for the plan
   * action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLastStep: Signal<boolean> = computed<boolean>(
    () => STEP_ORDER.indexOf(this.activeStep()) === STEP_ORDER.length - 1,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds the step controls from the intervention whenever it changes and
   * mirrors the saving/disabled inputs onto the controls' disabled state.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const intervention: InterventionOutput = this.intervention();
      // A refresh of the same intervention (a step save, a work-item change)
      // must not wipe fields the user is still editing on another step.
      const fresh: boolean = intervention.id !== this.lastSeededId;
      this.lastSeededId = intervention.id;
      this.seedControl(this.nameControl, intervention.name, fresh);
      this.seedControl(this.descriptionControl, intervention.description ?? '', fresh);
      this.seedControl(this.siteControl, intervention.site, fresh);
      this.seedControl(this.responsibleControl, intervention.responsible, fresh);
      this.seedControl(this.participantsControl, intervention.participants, fresh);
      this.seedControl(this.priorityControl, intervention.priority, fresh);
      this.seedControl(this.plannedStartAtControl, this.toDate(intervention.plannedStartAt), fresh);
      this.seedControl(this.dueAtControl, this.toDate(intervention.dueAt), fresh);
    });

    this.plannedStartAtControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.dueAtControl.updateValueAndValidity({ emitEvent: false }));

    // Selects and pickers autosave shortly after a change ("Each step saves
    // as you continue") — otherwise the final step's plan action, whose
    // enablement reads the PERSISTED intervention, could never unlock
    // without navigating away. Text fields keep saving on navigation only.
    const autosaveControls: readonly (readonly [
      keyof InterventionPlanningGuideValues,
      FormControl,
    ])[] = [
      ['site', this.siteControl],
      ['responsible', this.responsibleControl],
      ['participants', this.participantsControl],
      ['priority', this.priorityControl],
      ['plannedStartAt', this.plannedStartAtControl],
      ['dueAt', this.dueAtControl],
    ];
    for (const [key, control] of autosaveControls) {
      control.valueChanges
        .pipe(debounceTime(600), takeUntilDestroyed())
        .subscribe(() => this.autosaveControl(key, control));
    }

    effect(() => {
      const frozen: boolean = this.saving() || this.disabled();
      for (const control of this.allControls()) {
        if (frozen) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
      }
    });
  }
  //#endregion

  //#region Navigation
  /**
   * Method goTo
   * @method goTo
   *
   * @description
   * Jumps to a step from the rail, flushing the active step's valid dirty
   * fields first so nothing typed is lost.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionPlanningGuideStep} step - Target step.
   *
   * @returns {void}
   */
  protected goTo(step: InterventionPlanningGuideStep): void {
    if (step === this.activeStep()) return;
    this.flushActiveStep(false);
    this.activeStep.set(step);
  }

  /**
   * Method continueStep
   * @method continueStep
   *
   * @description
   * Validates the active step, saves its edited fields and advances to the
   * next step. Invalid steps stay put with their errors surfaced.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected continueStep(): void {
    if (!this.flushActiveStep(true)) return;
    const index: number = STEP_ORDER.indexOf(this.activeStep());
    if (index < STEP_ORDER.length - 1) this.activeStep.set(STEP_ORDER[index + 1]);
  }

  /**
   * Method backStep
   * @method backStep
   *
   * @description
   * Returns to the previous step, flushing the active step's valid dirty
   * fields first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected backStep(): void {
    const index: number = STEP_ORDER.indexOf(this.activeStep());
    if (index === 0) return;
    this.flushActiveStep(false);
    this.activeStep.set(STEP_ORDER[index - 1]);
  }

  /**
   * Method requestPlan
   * @method requestPlan
   *
   * @description
   * Flushes the final step then asks the parent to run the plan transition,
   * a no-op while incomplete or forbidden.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestPlan(): void {
    if (this.disabled() || this.saving()) return;
    if (!this.flushActiveStep(true)) return;
    if (!this.allComplete()) return;
    this.planRequested.emit();
  }
  //#endregion

  //#region Step helpers
  /**
   * Method workItemLabel
   * @method workItemLabel
   *
   * @description
   * Human-readable scope-step row label: resolved action label plus the
   * embedded target identity when known.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to label.
   *
   * @returns {string}
   */
  protected workItemLabel(item: InterventionWorkItemOutput): string {
    const actionLabel: string = resolveInterventionTag('workItemAction', item.action).label;
    if (item.targetSummary) return `${actionLabel} · ${item.targetSummary.label}`;
    const target: string | null = item.target;
    if (!target || target.startsWith('/api/')) return actionLabel;
    return `${actionLabel} · ${target}`;
  }

  /**
   * Method flushActiveStep
   * @method flushActiveStep
   *
   * @description
   * Emits the active step's dirty fields through {@link stepSaved}. In
   * strict mode an invalid step blocks (controls marked touched); otherwise
   * only valid dirty fields are emitted.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {boolean} strict - Whether invalid controls block the flush.
   *
   * @returns {boolean} False when a strict flush was blocked by validation.
   */
  private flushActiveStep(strict: boolean): boolean {
    if (this.disabled()) return true;
    const controls: readonly (readonly [keyof InterventionPlanningGuideValues, FormControl])[] =
      this.stepControls(this.activeStep());

    if (strict) {
      const invalid: boolean = controls.some(([, control]): boolean => control.invalid);
      if (invalid) {
        for (const [, control] of controls) control.markAsTouched();
        return false;
      }
    }

    const values: Record<string, unknown> = {};
    for (const [key, control] of controls) {
      if (!control.dirty || control.invalid) continue;
      values[key] = this.controlValue(key, control);
      control.markAsPristine();
    }
    if (Object.keys(values).length > 0) {
      this.stepSaved.emit(values as InterventionPlanningGuideValues);
    }
    return true;
  }

  /**
   * Method controlValue
   * @method controlValue
   *
   * @description
   * Normalizes a control value for the merge-patch payload — trimmed
   * nullable description, null for cleared selects, raw value otherwise.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {keyof InterventionPlanningGuideValues} key - Payload key.
   * @param {FormControl} control - Source control.
   *
   * @returns {unknown} Normalized payload value.
   */
  private controlValue(key: keyof InterventionPlanningGuideValues, control: FormControl): unknown {
    const value: unknown = control.value;
    if (key === 'description') return typeof value === 'string' ? value.trim() || null : null;
    if (key === 'name') return typeof value === 'string' ? value.trim() : value;
    if (key === 'site' || key === 'responsible') return value || null;
    return value;
  }

  /**
   * Method stepControls
   * @method stepControls
   *
   * @description
   * Payload key to control pairs owned by a step.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionPlanningGuideStep} step - Step to resolve.
   *
   * @returns {readonly (readonly [keyof InterventionPlanningGuideValues, FormControl])[]}
   */
  private stepControls(
    step: InterventionPlanningGuideStep,
  ): readonly (readonly [keyof InterventionPlanningGuideValues, FormControl])[] {
    switch (step) {
      case 'context':
        return [
          ['name', this.nameControl],
          ['description', this.descriptionControl],
        ];
      case 'scope':
        return [['site', this.siteControl]];
      case 'team':
        return [
          ['responsible', this.responsibleControl],
          ['participants', this.participantsControl],
        ];
      case 'schedule':
        return [
          ['plannedStartAt', this.plannedStartAtControl],
          ['dueAt', this.dueAtControl],
          ['priority', this.priorityControl],
        ];
    }
  }

  /**
   * Method firstIncompleteStep
   * @method firstIncompleteStep
   *
   * @description
   * First step whose persisted data is still missing; the last step when
   * everything is already complete.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention to inspect.
   *
   * @returns {InterventionPlanningGuideStep}
   */
  private firstIncompleteStep(intervention: InterventionOutput): InterventionPlanningGuideStep {
    if (!intervention.site) return 'scope';
    if (!intervention.responsible) return 'team';
    if (!intervention.plannedStartAt || !intervention.dueAt) return 'schedule';
    return 'schedule';
  }

  /**
   * Method allControls
   * @method allControls
   *
   * @description
   * Every step control, for bulk enable/disable.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {readonly FormControl[]}
   */
  private allControls(): readonly FormControl[] {
    return [
      this.nameControl,
      this.descriptionControl,
      this.siteControl,
      this.responsibleControl,
      this.participantsControl,
      this.priorityControl,
      this.plannedStartAtControl,
      this.dueAtControl,
    ];
  }

  /**
   * Method autosaveControl
   * @method autosaveControl
   *
   * @description
   * Emits one control's dirty valid value through {@link stepSaved} after
   * the debounce, a no-op while forbidden, saving, pristine or invalid.
   *
   * @access private
   * @since 1.2.0
   *
   * @param {keyof InterventionPlanningGuideValues} key - Payload key.
   * @param {FormControl} control - Control to autosave.
   *
   * @returns {void}
   */
  private autosaveControl(key: keyof InterventionPlanningGuideValues, control: FormControl): void {
    if (this.disabled() || this.saving()) return;
    if (!control.dirty || control.invalid) return;
    const values: Record<string, unknown> = { [key]: this.controlValue(key, control) };
    control.markAsPristine();
    this.stepSaved.emit(values as InterventionPlanningGuideValues);
  }

  /**
   * Method seedControl
   * @method seedControl
   *
   * @description
   * Resets one control from the persisted intervention, skipping dirty
   * controls unless a different intervention loaded (`fresh`).
   *
   * @access private
   * @since 1.1.0
   *
   * @param {FormControl<T>} control - Control to seed.
   * @param {T} value - Persisted value.
   * @param {boolean} fresh - Whether a new intervention forces the reset.
   *
   * @returns {void}
   */
  private seedControl<T>(control: FormControl<T>, value: T, fresh: boolean): void {
    if (!fresh && control.dirty) return;
    control.reset(value, { emitEvent: false });
  }

  /**
   * Method dueAfterStart
   * @method dueAfterStart
   *
   * @description
   * Cross-field validator: the due date must not precede the planned start
   * when both are set.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {AbstractControl} control - Due date control under validation.
   *
   * @returns {ValidationErrors | null} `dueBeforeStart` error, or null.
   */
  private dueAfterStart(control: AbstractControl): ValidationErrors | null {
    const due: unknown = control.value;
    const start: Date | null = this.plannedStartAtControl?.value ?? null;
    if (!(due instanceof Date) || !start) return null;
    return due.getTime() >= start.getTime() ? null : { dueBeforeStart: true };
  }

  /**
   * Method toDate
   * @method toDate
   *
   * @description
   * Converts an API ISO date-time string to a `Date` for the date-picker;
   * null for empty or invalid values.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} value - API ISO date-time string.
   *
   * @returns {Date | null}
   */
  private toDate(value: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  //#endregion
}
