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

/** Presentational form used to create an intervention draft. */
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
  public readonly loading: InputSignal<boolean> = input(false);
  public readonly optionsLoading: InputSignal<boolean> = input(false);
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  public readonly referencePackOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  public readonly submitted: OutputEmitterRef<InterventionCreateFormValues> =
    output<InterventionCreateFormValues>();

  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

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
      referencePack: this.formBuilder.control(''),
    });

  protected readonly priorityOptions: readonly SelectOption<InterventionPriority>[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

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

  public constructor() {
    effect(() => {
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
