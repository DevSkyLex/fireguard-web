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
import { NonNullableFormBuilder, ReactiveFormsModule, type FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import type {
  InterventionWorkItemAction,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '../../components/intervention-member-option/intervention-member-option.component';
import type { InterventionWorkItemFormData, InterventionWorkItemFormValues } from './models';

/** Presentational form used to add a work item to prepared scope. */
@Component({
  selector: 'app-intervention-work-item-form',
  imports: [ButtonModule, InterventionMemberOption, ReactiveFormsModule, SelectModule],
  templateUrl: './intervention-work-item-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemForm {
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  public readonly loading: InputSignal<boolean> = input(false);
  public readonly disabled: InputSignal<boolean> = input(false);
  public readonly submitted: OutputEmitterRef<InterventionWorkItemFormValues> =
    output<InterventionWorkItemFormValues>();

  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  protected readonly form: FormGroup<InterventionWorkItemFormData> =
    this.formBuilder.group<InterventionWorkItemFormData>({
      action: this.formBuilder.control<InterventionWorkItemAction>('inventory'),
      target: this.formBuilder.control(''),
      assignee: this.formBuilder.control(''),
    });

  protected readonly actionOptions: readonly SelectOption<InterventionWorkItemAction>[] = [
    { label: 'Site setup', value: 'site_setup' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Inspection', value: 'inspection' },
  ];

  public constructor() {
    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) return;
    this.submitted.emit(this.form.getRawValue());
    this.form.reset({ action: 'inventory', target: '', assignee: '' });
  }
}
