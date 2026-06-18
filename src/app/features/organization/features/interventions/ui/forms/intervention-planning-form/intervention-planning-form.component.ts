import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import type {
  InterventionOutput,
  InterventionPriority,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '../../components/intervention-member-option/intervention-member-option.component';
import { InterventionOption } from '../../components/intervention-option';
import type { InterventionPlanningFormData, InterventionPlanningFormValues } from './models';

/**
 * Component InterventionPlanningForm
 * @class InterventionPlanningForm
 *
 * @description
 * Presentational form used to edit intervention planning details.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-planning-form',
  imports: [
    ButtonModule,
    DatePickerModule,
    InterventionMemberOption,
    InterventionOption,
    MessageModule,
    MultiSelectModule,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './intervention-planning-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPlanningForm {
  //#region Inputs
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Intervention used to seed the planning form initial values on load
   * and when the upstream data changes.
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
   * Available intervention site options for the site selector.
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
   * Available organization member options for the responsible and
   * participants selectors.
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
   * Property loading
   * @readonly
   *
   * @description
   * Whether a planning save is in flight; disables all form controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether planning editing is forbidden (e.g. insufficient permissions).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits validated planning values when the form is submitted successfully.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionPlanningFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionPlanningFormValues> =
    output<InterventionPlanningFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Builds the typed reactive form controls.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group holding all intervention planning controls.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InterventionPlanningFormData>}
   */
  protected readonly form: FormGroup<InterventionPlanningFormData> =
    this.formBuilder.group<InterventionPlanningFormData>({
      site: this.formBuilder.control('', [Validators.required]),
      responsible: this.formBuilder.control('', [Validators.required]),
      participants: this.formBuilder.control<readonly string[]>([]),
      priority: this.formBuilder.control<InterventionPriority>('normal', [Validators.required]),
      plannedStartAt: new FormControl<Date | null>(null, [Validators.required]),
      dueAt: new FormControl<Date | null>(null, [Validators.required]),
    });

  /**
   * Property priorityOptions
   * @readonly
   *
   * @description
   * Static list of available intervention priorities for the priority select.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SelectOption<InterventionPriority>[]}
   */
  protected readonly priorityOptions: readonly SelectOption<InterventionPriority>[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the form reactively when the intervention input changes, and
   * synchronizes the disabled state with the {@link loading} and
   * {@link disabled} inputs.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const intervention = this.intervention();
      this.form.reset(
        {
          site: intervention.site ?? '',
          responsible: intervention.responsible ?? '',
          participants: intervention.participants,
          priority: intervention.priority,
          plannedStartAt: this.toDate(intervention.plannedStartAt),
          dueAt: this.toDate(intervention.dueAt),
        },
        { emitEvent: false },
      );
    });

    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Validates the form and emits planning values via {@link submitted}.
   * Marks all controls as touched to surface validation errors when
   * the form is invalid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }

  /**
   * Method toDate
   * @method toDate
   *
   * @description
   * Converts an API ISO date-time string to a `Date` instance for the
   * PrimeNG date-picker. Returns `null` for empty or invalid values.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} value - API ISO date-time string.
   *
   * @returns {Date | null} Parsed date, or `null` when invalid.
   */
  private toDate(value: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  //#endregion
}
