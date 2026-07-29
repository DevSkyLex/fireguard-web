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
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import type {
  InviteOrganizationMemberInput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@shared/utils';

/**
 * Component OrganizationInvitationForm
 * @class OrganizationInvitationForm
 *
 * @description
 * Presentational form used to invite a member to the active organization by
 * email with an optional initial role. Owns only its form state; it emits the
 * validated values (`submitted`) or a dismissal (`cancelled`) and never sends,
 * navigates, or controls drawer visibility — the parent owns orchestration.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invitation-form',
  imports: [ButtonModule, InputTextModule, MessageModule, ReactiveFormsModule, SelectModule],
  templateUrl: './organization-invitation-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationForm {
  //#region Inputs
  /**
   * Property roles
   * @readonly
   *
   * @description
   * Roles offered as the invitee's initial role.
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
   * Whether an invitation request is in flight; disables the form controls.
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
   * Whether an address is already invited or already a member is only knowable
   * server-side, and it comes back as a 422 naming `email` — the exact case that
   * used to surface as a bare toast.
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
    () => toUnmatchedViolations(this.serverError(), ['email', 'roleId'])[0]?.message ?? null,
  );
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the validated invitation values when the form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InviteOrganizationMemberInput>}
   */
  public readonly submitted: OutputEmitterRef<InviteOrganizationMemberInput> = output();

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
   * Strictly typed invitation form (required email, optional initial role).
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly form = this.formBuilder.group({
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    roleId: this.formBuilder.control(''),
  });
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
   * Emits the validated invitation values.
   *
   * Deliberately does not reset: the outcome is not known yet, and clearing here
   * meant a rejected address — already invited, quota reached — wiped what the
   * member typed. The parent closes this surface once the server confirms.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected submit(): void {
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    this.submitted.emit({ email: values.email, roleIds: values.roleId ? [values.roleId] : [] });
  }
  //#endregion
}
