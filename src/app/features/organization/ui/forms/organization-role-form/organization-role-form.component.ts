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
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import type {
  OrganizationPermissionOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';

/** Values used to create or update an organization role. */
export interface OrganizationRoleFormValues {
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

/**
 * Form used to create or update an organization role.
 */
@Component({
  selector: 'app-organization-role-form',
  imports: [ButtonModule, InputTextModule, MultiSelectModule, ReactiveFormsModule, TextareaModule],
  templateUrl: './organization-role-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleForm {
  /** Existing role when the form is editing. */
  public readonly role: InputSignal<OrganizationRoleOutput | null> =
    input<OrganizationRoleOutput | null>(null);
  /** Permissions available for role configuration. */
  public readonly permissions: InputSignal<readonly OrganizationPermissionOutput[]> =
    input.required();
  /** Whether role submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid role values. */
  public readonly submitted: OutputEmitterRef<OrganizationRoleFormValues> = output();
  /** Emits cancellation of role editing. */
  public readonly cancelled: OutputEmitterRef<void> = output();
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  /** Strictly typed role form. */
  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.control('', [Validators.required]),
    description: this.formBuilder.control(''),
    permissions: this.formBuilder.control<string[]>([]),
  });

  /** Synchronizes existing role values and submission state. */
  public constructor() {
    effect(() => {
      const role = this.role();
      this.form.reset(
        {
          name: role?.name ?? '',
          description: role?.description ?? '',
          permissions: [...(role?.permissions ?? [])],
        },
        { emitEvent: false },
      );
      if (role) this.form.controls.name.disable({ emitEvent: false });
      else this.form.controls.name.enable({ emitEvent: false });
    });
    effect(() => {
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
        return;
      }

      this.form.enable({ emitEvent: false });
      if (this.role()) this.form.controls.name.disable({ emitEvent: false });
    });
  }
  /** Emits valid role values. */
  protected submit(): void {
    if (this.form.valid) this.submitted.emit(this.form.getRawValue());
  }
}
