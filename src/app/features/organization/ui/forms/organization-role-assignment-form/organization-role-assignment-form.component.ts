import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@core/api';
import type {
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import type { MemberOption, OrganizationRoleAssignmentValues } from './models';

/**
 * Component OrganizationRoleAssignmentForm
 * @class OrganizationRoleAssignmentForm
 *
 * @description
 * Presentational form used to assign an organization role to an existing member.
 * Owns only its form state; it emits the validated values (`submitted`) or a
 * dismissal (`cancelled`) and never assigns, navigates, or controls drawer
 * visibility — the parent owns orchestration.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-assignment-form',
  imports: [ButtonModule, MessageModule, ReactiveFormsModule, SelectModule],
  templateUrl: './organization-role-assignment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleAssignmentForm {
  //#region Inputs
  /**
   * Property members
   * @readonly
   *
   * @description
   * Members eligible for role assignment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OrganizationMemberOutput[]>}
   */
  public readonly members: InputSignal<readonly OrganizationMemberOutput[]> = input.required();

  /**
   * Property roles
   * @readonly
   *
   * @description
   * Roles available for assignment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OrganizationRoleOutput[]>}
   */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether an assignment request is in flight; disables the form controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input serverError
   * @input
   *
   * @description
   * Last rejection from the parent page, as held by the store's call state.
   *
   * A 422 names the field the server refused; projecting it tells the user which
   * one to fix instead of leaving them with a generic toast.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /** Message of the first violation naming no field of this form. */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () => toUnmatchedViolations(this.serverError(), ['memberId', 'roleId'])[0]?.message ?? null,
  );

  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the validated role assignment values when the form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationRoleAssignmentValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationRoleAssignmentValues> = output();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emits when the user dismisses the form without submitting.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Non-nullable builder preserving strict form value types.
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
   * Strictly typed role assignment form (required member and role).
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly form = this.formBuilder.group({
    memberId: this.formBuilder.control('', [Validators.required]),
    roleId: this.formBuilder.control('', [Validators.required]),
  });

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Member options carrying a resolved, non-empty display label for the selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberOption[]>}
   */
  protected readonly memberOptions: Signal<readonly MemberOption[]> = computed(() =>
    this.members().map((member) => ({ id: member.id, label: this.memberLabel(member) })),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor.
   *
   * @description
   * Synchronizes the form's disabled state with the loading input.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() =>
      this.loading()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Emits the validated role assignment values.
   *
   * Deliberately does not reset: the outcome is not known yet, and clearing here
   * discarded the selection whenever the assignment was refused. The parent closes
   * this surface once the server confirms.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected submit(): void {
    if (this.form.invalid) return;
    this.submitted.emit(this.form.getRawValue());
  }

  /**
   * Method memberLabel
   *
   * @description
   * Resolves the best available display label for a member (display name, full
   * name, then the user id as a last resort).
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OrganizationMemberOutput} member - The member to label.
   *
   * @returns {string} The resolved, non-empty label.
   */
  private memberLabel(member: OrganizationMemberOutput): string {
    const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
    return member.displayName?.trim() || fullName || member.userId;
  }
  //#endregion
}
