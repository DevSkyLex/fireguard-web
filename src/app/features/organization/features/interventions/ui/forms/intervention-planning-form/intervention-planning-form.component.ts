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

/** Presentational form used to edit intervention planning details. */
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
  public readonly intervention: InputSignal<InterventionOutput> = input.required();
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  public readonly loading: InputSignal<boolean> = input(false);
  public readonly disabled: InputSignal<boolean> = input(false);
  public readonly submitted: OutputEmitterRef<InterventionPlanningFormValues> =
    output<InterventionPlanningFormValues>();

  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  protected readonly form: FormGroup<InterventionPlanningFormData> =
    this.formBuilder.group<InterventionPlanningFormData>({
      site: this.formBuilder.control('', [Validators.required]),
      responsible: this.formBuilder.control('', [Validators.required]),
      participants: this.formBuilder.control<readonly string[]>([]),
      priority: this.formBuilder.control<InterventionPriority>('normal', [Validators.required]),
      plannedStartAt: new FormControl<Date | null>(null, [Validators.required]),
      dueAt: new FormControl<Date | null>(null, [Validators.required]),
    });

  protected readonly priorityOptions: readonly SelectOption<InterventionPriority>[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

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

  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }

  private toDate(value: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
