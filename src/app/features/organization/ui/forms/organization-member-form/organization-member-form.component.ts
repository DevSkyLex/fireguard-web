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
  AddOrganizationMemberInput,
  OrganizationRoleOutput,
} from '@features/organization/models';

/**
 * Form used to add an existing user to the active organization.
 */
@Component({
  selector: 'app-organization-member-form',
  imports: [ButtonModule, InputTextModule, ReactiveFormsModule, SelectModule],
  templateUrl: './organization-member-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMemberForm {
  /** Roles available for the new member. */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();
  /** Whether member submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid member values. */
  public readonly submitted: OutputEmitterRef<AddOrganizationMemberInput> = output();
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);
  /** Strictly typed member form. */
  protected readonly form = this.formBuilder.group({
    userId: this.formBuilder.control('', [Validators.required]),
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

  /** Emits valid member values and resets the form. */
  protected submit(): void {
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    this.submitted.emit({ userId: values.userId, roleIds: values.roleId ? [values.roleId] : [] });
    this.form.reset({ userId: '', roleId: '' });
  }
}
