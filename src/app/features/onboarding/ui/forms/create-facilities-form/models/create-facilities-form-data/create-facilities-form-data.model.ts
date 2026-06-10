import type { FormArray, FormGroup } from '@angular/forms';
import type { CreateFacilityFormData } from '../../../create-facility-form/models';

export interface CreateFacilitiesFormData {
  rows: FormArray<FormGroup<CreateFacilityFormData>>;
}
