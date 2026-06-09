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
import { SelectModule } from 'primeng/select';
import type {
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';

/** Values required to assign an organization role to a member. */
export interface OrganizationRoleAssignmentValues {
  readonly memberId: string;
  readonly roleId: string;
}

/**
 * Form used to assign an organization role to a member.
 */
@Component({
  selector: 'app-organization-role-assignment-form',
  imports: [ButtonModule, ReactiveFormsModule, SelectModule],
  templateUrl: './organization-role-assignment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleAssignmentForm {
  /** Members eligible for role assignment. */
  public readonly members: InputSignal<readonly OrganizationMemberOutput[]> = input.required();
  /** Roles available for assignment. */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();
  /** Whether assignment submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid role assignment values. */
  public readonly submitted: OutputEmitterRef<OrganizationRoleAssignmentValues> = output();
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  /** Strictly typed role assignment form. */
  protected readonly form = this.formBuilder.group({
    memberId: this.formBuilder.control('', [Validators.required]),
    roleId: this.formBuilder.control('', [Validators.required]),
  });
  /** Synchronizes the form disabled state with submission. */
  public constructor() {
    effect(() =>
      this.loading()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }
  /** Emits valid role assignment values. */
  protected submit(): void {
    if (this.form.valid) this.submitted.emit(this.form.getRawValue());
  }
}
