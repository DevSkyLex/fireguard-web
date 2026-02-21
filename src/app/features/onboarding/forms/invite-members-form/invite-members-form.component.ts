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
import type { InviteMembersFormData } from './invite-members-form-data.type';
import type { InviteMembersFormValues } from './invite-members-form-values.type';

@Component({
  selector: 'app-invite-members-form',
  imports: [
    ReactiveFormsModule,
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
  public readonly inviting: InputSignal<boolean> = input<boolean>(false);
  public readonly executing: InputSignal<boolean> = input<boolean>(false);
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  public readonly invited: OutputEmitterRef<InviteMembersFormValues> =
    output<InviteMembersFormValues>();
  public readonly completed: OutputEmitterRef<void> = output<void>();
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  protected readonly form: FormGroup<InviteMembersFormData> =
    this.formBuilder.group<InviteMembersFormData>({
      email: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(255),
      ]),
      roleKey: this.formBuilder.control<string>('member', [Validators.required]),
    });
  //#endregion

  //#region Methods
  protected onSubmit(): void {
    if (this.form.invalid) return;
    const formValues: InviteMembersFormValues = this.form.getRawValue();
    this.invited.emit(formValues);
    this.form.reset({ email: '', roleKey: 'member' });
  }

  protected onComplete(): void {
    this.completed.emit();
  }

  protected onSkip(): void {
    this.skipped.emit();
  }
  //#endregion
}
