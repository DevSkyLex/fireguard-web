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
import { InterventionOption } from '../../components/intervention-option';
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
  imports: [
    ButtonModule,
    InterventionMemberOption,
    InterventionOption,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './intervention-work-item-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemForm {
  //#region Inputs
  /**
   * Property targetOptions
   * @readonly
   *
   * @description
   * Available target options (facilities and equipment) for the target selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Available member options for the assignee selector.
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
   * Whether a work-item creation is in flight; disables all form controls.
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
   * Whether work-item creation is forbidden (e.g. insufficient permissions).
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
   * Emits validated work item values when the form is submitted successfully.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionWorkItemFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionWorkItemFormValues> =
    output<InterventionWorkItemFormValues>();
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
   * Reactive form group holding all work item controls.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InterventionWorkItemFormData>}
   */
  protected readonly form: FormGroup<InterventionWorkItemFormData> =
    this.formBuilder.group<InterventionWorkItemFormData>({
      action: this.formBuilder.control<InterventionWorkItemAction>('inventory'),
      target: this.formBuilder.control(''),
      assignee: this.formBuilder.control(''),
    });

  /**
   * Property actionOptions
   * @readonly
   *
   * @description
   * Static list of available work item actions for the action selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SelectOption<InterventionWorkItemAction>[]}
   */
  protected readonly actionOptions: readonly SelectOption<InterventionWorkItemAction>[] = [
    { label: 'Site setup', value: 'site_setup' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Inspection', value: 'inspection' },
  ];

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes the form disabled state with the {@link loading} and
   * {@link disabled} inputs.
   *
   * @since 1.0.0
   */
  public constructor() {
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
   * Validates the form, emits the work item values via {@link submitted} and
   * resets the form to its default state for immediate re-use.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) return;
    this.submitted.emit(this.form.getRawValue());
    this.form.reset({ action: 'inventory', target: '', assignee: '' });
  }
  //#endregion
}
