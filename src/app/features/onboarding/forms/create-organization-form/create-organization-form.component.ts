import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type FormGroup,
  Validators,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import type { CreateOrganizationFormData } from './create-organization-form-data.type';
import type { CreateOrganizationFormValues } from './create-organization-form-values.type';

@Component({
  selector: 'app-create-organization-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './create-organization-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOrganizationForm {
  //#region Inputs
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  public readonly submitted: OutputEmitterRef<CreateOrganizationFormValues> =
    output<CreateOrganizationFormValues>();
  //#endregion

  //#region Properties
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  protected readonly form: FormGroup<CreateOrganizationFormData> =
    this.formBuilder.group<CreateOrganizationFormData>({
      organizationName: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ]),
    });
  //#endregion

  //#region Methods
  protected onSubmit(): void {
    if (this.form.invalid) return;
    const formValues: CreateOrganizationFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }
  //#endregion
}
