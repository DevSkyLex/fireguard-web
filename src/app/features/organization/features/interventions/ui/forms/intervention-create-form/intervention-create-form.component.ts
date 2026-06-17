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
import { InterventionOption } from '../../components/intervention-option';
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
    InterventionOption,
    MultiSelectModule,
    RadioCardGroup,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './intervention-create-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreateForm {
  //#region Inputs
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether draft creation is in flight; disables all form controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property optionsLoading
   * @readonly
   *
   * @description
   * Whether planning options (sites, members) are still loading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly optionsLoading: InputSignal<boolean> = input<boolean>(false);

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
   * Available organization member options for the participants and
   * responsible selectors.
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
   * Emits validated draft values when the form is submitted successfully.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionCreateFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionCreateFormValues> =
    output<InterventionCreateFormValues>();
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
  private readonly formBuilder: NonNullableFormBuilder = inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group holding all intervention draft controls.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InterventionCreateFormData>}
   */
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

  /**
   * Property interventionTypes
   * @readonly
   *
   * @description
   * Static list of intervention type radio card options rendered by
   * {@link RadioCardGroup}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {RadioCardOption[]}
   */
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

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes the form disabled state with the {@link loading} input
   * so controls are locked while a creation request is in flight.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.loading()) {
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
   * Validates the form and emits the raw values via {@link submitted}
   * when all controls are valid. Marks all controls as touched to
   * surface validation errors when the form is invalid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
  //#endregion
}
