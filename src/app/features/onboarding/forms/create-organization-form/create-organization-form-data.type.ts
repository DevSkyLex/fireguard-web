import type { FormControl } from '@angular/forms';
import type { CreateOrganizationFormValues } from './create-organization-form-values.type';

/**
 * Type CreateOrganizationFormData
 *
 * @description
 * Typed FormGroup shape for the create-organization onboarding form.
 *
 * @since 1.0.0
 */
export type CreateOrganizationFormData = {
  [K in keyof CreateOrganizationFormValues]: FormControl<CreateOrganizationFormValues[K]>;
};
