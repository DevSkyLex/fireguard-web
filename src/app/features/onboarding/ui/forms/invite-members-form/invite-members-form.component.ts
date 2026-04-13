import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import {
  FormArray,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { RadioCardGroup, type RadioCardOption } from '@shared/components';
import type { InviteMembersFormData, InviteeRowData } from './invite-members-form-data.type';
import type { InviteeRowValues, InviteMembersFormValues } from './invite-members-form-values.type';

/**
 * Component InviteMembersForm
 * @class InviteMembersForm
 *
 * @description
 * Presentational form component for inviting a single member during onboarding.
 * Emits the invitee values via `invited` output.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-invite-members-form',
  imports: [
    ReactiveFormsModule,
    RadioCardGroup,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './invite-members-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteMembersForm {
  //#region Inputs
  /**
   * Input roles
   * @readonly
   *
   * @description
   * Available organization roles for the role selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OrganizationRoleOutput[]>}
   */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input<
    readonly OrganizationRoleOutput[]
  >([]);

  /**
   * Input rolesLoading
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly rolesLoading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input inviting
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly inviting: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input executing
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly executing: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input skippable
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input busy
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output invited
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InviteMembersFormValues>}
   */
  public readonly invited: OutputEmitterRef<InviteMembersFormValues> =
    output<InviteMembersFormValues>();

  /**
   * Output completed
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly completed: OutputEmitterRef<void> = output<void>();

  /**
   * Output skipped
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Computed roleOptions
   * @readonly
   *
   * @description
   * Maps the raw roles to the shape expected by {@link RadioCardGroup}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<RadioCardOption[]>}
   */
  protected readonly roleOptions: Signal<RadioCardOption[]> = computed<RadioCardOption[]>(() => {
    const roles: readonly OrganizationRoleOutput[] = this.roles();
    return roles.map((role: OrganizationRoleOutput) => ({
      value: role.id,
      label: role.name.charAt(0).toUpperCase() + role.name.slice(1),
      description: role.description,
    }));
  });

  /**
   * Property form
   * @readonly
   *
   * @description
   * Root reactive form group containing the `rows` FormArray.
   * Each row holds one invitee's email and roleId.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InviteMembersFormData>}
   */
  protected readonly form: FormGroup<InviteMembersFormData> =
    this.formBuilder.group<InviteMembersFormData>({
      rows: this.formBuilder.array<FormGroup<InviteeRowData>>([this.buildRow()]),
    });

  /**
   * Getter rows
   *
   * @description
   * Shorthand accessor for the `rows` FormArray inside {@link form}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormArray<FormGroup<InviteeRowData>>}
   */
  protected get rows(): FormArray<FormGroup<InviteeRowData>> {
    return this.form.controls.rows;
  }
  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Disables/enables the rows reactively based on the inviting and busy inputs.
   */
  public constructor() {
    effect(() => {
      if (this.inviting() || this.busy()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method buildRow
   * @method buildRow
   *
   * @description
   * Creates a new FormGroup for a single invitee row with email and roleId controls.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {FormGroup<InviteeRowData>}
   */
  private buildRow(): FormGroup<InviteeRowData> {
    return this.formBuilder.group<InviteeRowData>({
      email: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(255),
      ]),
      roleId: this.formBuilder.control<string | null>(null, [Validators.required]),
    });
  }

  /**
   * Property maxRows
   * @readonly
   *
   * @description
   * Maximum number of invitee rows allowed in the form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly maxRows: number = 5;

  /**
   * Method addRow
   * @method addRow
   *
   * @description
   * Appends a new empty invitee row, up to the {@link maxRows} limit.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected addRow(): void {
    if (this.rows.length >= this.maxRows) return;
    this.rows.push(this.buildRow());
  }

  /**
   * Method removeRow
   * @method removeRow
   *
   * @description
   * Removes the invitee row at the given index.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Zero-based index of the row to remove.
   * @returns {void}
   */
  protected removeRow(index: number): void {
    this.rows.removeAt(index);
  }
  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Validates and emits the single invitee row values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.invited.emit(this.form.getRawValue().rows as InviteeRowValues[]);
    this.rows.clear();
    this.rows.push(this.buildRow());
  }

  /**
   * Method onComplete
   * @method onComplete
   *
   * @description
   * Emits the completed event to mark the step as done.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onComplete(): void {
    this.completed.emit();
  }

  /**
   * Method onSkip
   * @method onSkip
   *
   * @description
   * Emits the skipped event to skip this step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSkip(): void {
    this.skipped.emit();
  }
  //#endregion
}
