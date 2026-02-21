import type { FormControl } from '@angular/forms';
import type { CreateOrganizationFormValues } from './create-organization-form-values.type';

export type CreateOrganizationFormData = {
  [K in keyof CreateOrganizationFormValues]: FormControl<CreateOrganizationFormValues[K]>;
};
