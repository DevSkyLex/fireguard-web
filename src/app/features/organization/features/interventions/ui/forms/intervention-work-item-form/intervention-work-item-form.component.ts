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

/**
 * Component InterventionWorkItemForm
 * @class InterventionWorkItemForm
 *
 * @description
 * Presentational form used to add a work item to prepared scope.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-form',
  imports: [ButtonModule, InterventionMemberOption, ReactiveFormsModule, SelectModule],
  templateUrl: './intervention-work-item-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemForm {
  /** Input targetOptions. @readonly @description Available work item targets. @access public @since 1.0.0 @type {InputSignal<readonly SelectOption[]>} */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  /** Input memberOptions. @readonly @description Available assignees. @access public @since 1.0.0 @type {InputSignal<readonly MemberSelectOption[]>} */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  /** Input loading. @readonly @description Indicates whether submission is running. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Input disabled. @readonly @description Indicates whether the form is disabled. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly disabled: InputSignal<boolean> = input(false);
  /** Output submitted. @readonly @description Emits validated work item values. @access public @since 1.0.0 @type {OutputEmitterRef<InterventionWorkItemFormValues>} */
  public readonly submitted: OutputEmitterRef<InterventionWorkItemFormValues> =
    output<InterventionWorkItemFormValues>();

  /** Property formBuilder. @readonly @description Builds the typed reactive form. @access private @since 1.0.0 @type {NonNullableFormBuilder} */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  /** Property form. @readonly @description Stores work item controls. @access protected @since 1.0.0 @type {FormGroup<InterventionWorkItemFormData>} */
  protected readonly form: FormGroup<InterventionWorkItemFormData> =
    this.formBuilder.group<InterventionWorkItemFormData>({
      action: this.formBuilder.control<InterventionWorkItemAction>('inventory'),
      target: this.formBuilder.control(''),
      assignee: this.formBuilder.control(''),
    });

  /** Property actionOptions. @readonly @description Available intervention actions. @access protected @since 1.0.0 @type {readonly SelectOption<InterventionWorkItemAction>[]} */
  protected readonly actionOptions: readonly SelectOption<InterventionWorkItemAction>[] = [
    { label: 'Site setup', value: 'site_setup' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Inspection', value: 'inspection' },
  ];

  /** @constructor @description Synchronizes the form disabled state with component inputs. */
  public constructor() {
    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  /** Method onSubmit. @method onSubmit @description Validates, emits and resets the work item form. @access protected @since 1.0.0 @returns {void} */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) return;
    this.submitted.emit(this.form.getRawValue());
    this.form.reset({ action: 'inventory', target: '', assignee: '' });
  }
}
