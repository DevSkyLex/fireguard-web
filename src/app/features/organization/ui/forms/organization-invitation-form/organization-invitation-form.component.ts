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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type {
  InviteOrganizationMemberInput,
  OrganizationRoleOutput,
} from '@features/organization/models';

/**
 * Form used to invite a member to the active organization.
 */
@Component({
  selector: 'app-organization-invitation-form',
  imports: [ButtonModule, InputTextModule, ReactiveFormsModule, SelectModule],
  templateUrl: './organization-invitation-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationForm {
  /** Roles available for the invitation. */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();
  /** Whether invitation submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid invitation values. */
  public readonly submitted: OutputEmitterRef<InviteOrganizationMemberInput> = output();
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  /** Strictly typed invitation form. */
  protected readonly form = this.formBuilder.group({
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    roleId: this.formBuilder.control(''),
  });

  /** Synchronizes the form disabled state with submission. */
  public constructor() {
    effect(() =>
      this.loading()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }

  /** Emits valid invitation values and resets the form. */
  protected submit(): void {
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    this.submitted.emit({ email: values.email, roleIds: values.roleId ? [values.roleId] : [] });
    this.form.reset({ email: '', roleId: '' });
  }
}
