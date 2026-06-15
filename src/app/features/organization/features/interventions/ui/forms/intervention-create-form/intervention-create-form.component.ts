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
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import type {
  InterventionPriority,
  InterventionType,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { RadioCardGroup, type RadioCardOption } from '@shared/components';
import { InterventionMemberOption } from '../../components/intervention-member-option/intervention-member-option.component';
import type { InterventionCreateFormData, InterventionCreateFormValues } from './models';

/**
 * Component InterventionCreateForm
 * @class InterventionCreateForm
 *
 * @description
 * Presentational form used to create an intervention draft.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-form',
  imports: [
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    InterventionMemberOption,
    MultiSelectModule,
    RadioCardGroup,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './intervention-create-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreateForm {
  /** Input loading. @readonly @description Indicates whether draft creation is running. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Input optionsLoading. @readonly @description Indicates whether selector options are loading. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly optionsLoading: InputSignal<boolean> = input(false);
  /** Input siteOptions. @readonly @description Available intervention sites. @access public @since 1.0.0 @type {InputSignal<readonly SelectOption[]>} */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  /** Input memberOptions. @readonly @description Available organization members. @access public @since 1.0.0 @type {InputSignal<readonly MemberSelectOption[]>} */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  /** Output submitted. @readonly @description Emits validated draft values. @access public @since 1.0.0 @type {OutputEmitterRef<InterventionCreateFormValues>} */
  public readonly submitted: OutputEmitterRef<InterventionCreateFormValues> =
    output<InterventionCreateFormValues>();

  /** Property formBuilder. @readonly @description Builds the typed reactive form. @access private @since 1.0.0 @type {NonNullableFormBuilder} */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  /** Property form. @readonly @description Stores intervention draft controls. @access protected @since 1.0.0 @type {FormGroup<InterventionCreateFormData>} */
  protected readonly form: FormGroup<InterventionCreateFormData> =
    this.formBuilder.group<InterventionCreateFormData>({
      name: this.formBuilder.control('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255),
      ]),
      type: this.formBuilder.control<InterventionType>('site_setup', [Validators.required]),
      site: this.formBuilder.control(''),
      responsible: this.formBuilder.control(''),
      participants: this.formBuilder.control<readonly string[]>([]),
      priority: this.formBuilder.control<InterventionPriority>('normal', [Validators.required]),
      plannedStartAt: new FormControl<Date | null>(null),
      dueAt: new FormControl<Date | null>(null),
    });

  /** Property priorityOptions. @readonly @description Available intervention priorities. @access protected @since 1.0.0 @type {readonly SelectOption<InterventionPriority>[]} */
  protected readonly priorityOptions: readonly SelectOption<InterventionPriority>[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  /** Property interventionTypes. @readonly @description Available intervention type radio cards. @access protected @since 1.0.0 @type {RadioCardOption[]} */
  protected readonly interventionTypes: RadioCardOption[] = [
    {
      value: 'site_setup',
      label: 'Site setup',
      description: 'Declare or enrich a site and its hierarchy.',
      icon: 'pi pi-sitemap',
    },
    {
      value: 'inventory',
      label: 'Inventory',
      description: 'Verify and complete equipment inventory.',
      icon: 'pi pi-box',
    },
    {
      value: 'inspection_campaign',
      label: 'Inspection campaign',
      description: 'Execute a prepared inspection campaign.',
      icon: 'pi pi-clipboard',
    },
  ];

  /** @constructor @description Synchronizes the form disabled state with the loading input. */
  public constructor() {
    effect(() => {
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  /** Method onSubmit. @method onSubmit @description Validates and emits intervention draft values. @access protected @since 1.0.0 @returns {void} */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
