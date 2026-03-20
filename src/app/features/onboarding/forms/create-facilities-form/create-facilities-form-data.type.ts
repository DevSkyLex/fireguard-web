import type { FormArray, FormGroup } from '@angular/forms';
import type { CreateFacilityFormData } from '../create-facility-form/create-facility-form-data.type';

export interface CreateFacilitiesFormData {
  rows: FormArray<FormGroup<CreateFacilityFormData>>;
}
