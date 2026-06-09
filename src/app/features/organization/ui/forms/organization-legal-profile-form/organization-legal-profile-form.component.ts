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
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import type {
  OrganizationLegalProfileOutput,
  UpsertOrganizationLegalProfileInput,
} from '@features/organization/models';

/** Legal type accepted by the organization legal profile API. */
type LegalType = UpsertOrganizationLegalProfileInput['legalType'];

/**
 * Form used to create or update an organization legal profile.
 */
@Component({
  selector: 'app-organization-legal-profile-form',
  imports: [ButtonModule, InputTextModule, MessageModule, ReactiveFormsModule, SelectModule],
  templateUrl: './organization-legal-profile-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLegalProfileForm {
  /** Existing legal profile when the form is editing. */
  public readonly profile: InputSignal<OrganizationLegalProfileOutput | null> =
    input<OrganizationLegalProfileOutput | null>(null);
  /** Whether legal profile submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid legal profile values. */
  public readonly submitted: OutputEmitterRef<UpsertOrganizationLegalProfileInput> = output();
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  /** Supported legal type options. */
  protected readonly legalTypeOptions: { label: string; value: LegalType }[] = [
    { label: 'Company', value: 'company' },
    { label: 'Non profit', value: 'non_profit' },
    { label: 'Public sector', value: 'public_sector' },
    { label: 'Individual', value: 'individual' },
    { label: 'Other', value: 'other' },
  ];
  /** Strictly typed legal profile form. */
  protected readonly form = this.formBuilder.group({
    countryCode: this.formBuilder.control('FR', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(2),
    ]),
    legalType: this.formBuilder.control<LegalType>('company', [Validators.required]),
    legalName: this.formBuilder.control('', [Validators.required]),
    registrationNumber: this.formBuilder.control(''),
    vatNumber: this.formBuilder.control(''),
  });

  /** Synchronizes existing profile values and submission state. */
  public constructor() {
    effect(() => {
      const profile = this.profile();
      if (profile)
        this.form.patchValue(
          {
            countryCode: profile.countryCode,
            legalType: profile.legalType as LegalType,
            legalName: profile.legalName,
            registrationNumber: profile.registrationNumber ?? '',
            vatNumber: profile.vatNumber ?? '',
          },
          { emitEvent: false },
        );
    });
    effect(() =>
      this.loading()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }
  /** Emits valid legal profile values. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    this.submitted.emit({
      countryCode: values.countryCode,
      legalType: values.legalType,
      legalName: values.legalName,
      registrationNumber: values.registrationNumber || null,
      vatNumber: values.vatNumber || null,
    });
  }
}
