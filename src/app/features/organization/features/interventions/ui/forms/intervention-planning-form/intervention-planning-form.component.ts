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
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import type {
  InterventionOutput,
  InterventionPriority,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '../../components/intervention-member-option/intervention-member-option.component';
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
    MultiSelectModule,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './intervention-planning-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPlanningForm {
  /** Input intervention. @readonly @description Intervention used to initialize planning controls. @access public @since 1.0.0 @type {InputSignal<InterventionOutput>} */
  public readonly intervention: InputSignal<InterventionOutput> = input.required();
  /** Input siteOptions. @readonly @description Available intervention sites. @access public @since 1.0.0 @type {InputSignal<readonly SelectOption[]>} */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  /** Input memberOptions. @readonly @description Available organization members. @access public @since 1.0.0 @type {InputSignal<readonly MemberSelectOption[]>} */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  /** Input loading. @readonly @description Indicates whether submission is running. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Input disabled. @readonly @description Indicates whether planning is disabled. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly disabled: InputSignal<boolean> = input(false);
  /** Output submitted. @readonly @description Emits validated planning values. @access public @since 1.0.0 @type {OutputEmitterRef<InterventionPlanningFormValues>} */
  public readonly submitted: OutputEmitterRef<InterventionPlanningFormValues> =
    output<InterventionPlanningFormValues>();

  /** Property formBuilder. @readonly @description Builds the typed reactive form. @access private @since 1.0.0 @type {NonNullableFormBuilder} */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  /** Property form. @readonly @description Stores intervention planning controls. @access protected @since 1.0.0 @type {FormGroup<InterventionPlanningFormData>} */
  protected readonly form: FormGroup<InterventionPlanningFormData> =
    this.formBuilder.group<InterventionPlanningFormData>({
      site: this.formBuilder.control('', [Validators.required]),
      responsible: this.formBuilder.control('', [Validators.required]),
      participants: this.formBuilder.control<readonly string[]>([]),
      priority: this.formBuilder.control<InterventionPriority>('normal', [Validators.required]),
      plannedStartAt: new FormControl<Date | null>(null, [Validators.required]),
      dueAt: new FormControl<Date | null>(null, [Validators.required]),
    });

  /** Property priorityOptions. @readonly @description Available intervention priorities. @access protected @since 1.0.0 @type {readonly SelectOption<InterventionPriority>[]} */
  protected readonly priorityOptions: readonly SelectOption<InterventionPriority>[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  /** @constructor @description Synchronizes planning values and the disabled state with component inputs. */
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

  /** Method onSubmit. @method onSubmit @description Validates and emits planning values. @access protected @since 1.0.0 @returns {void} */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }

  /** Method toDate. @method toDate @description Converts an API date-time value to a valid Date. @access private @since 1.0.0 @param {string | null} value - API date-time value. @returns {Date | null} */
  private toDate(value: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
