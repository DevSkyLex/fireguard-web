import type { FormControl } from '@angular/forms';
import type { MapAddFacilityFormValues } from '../map-add-facility-form-values';

/**
 * Type MapAddFacilityFormData
 *
 * @description
 * Typed FormGroup shape for {@link MapAddFacilityForm}.
 *
 * @since 1.0.0
 */
export type MapAddFacilityFormData = {
  [K in keyof MapAddFacilityFormValues]: FormControl<MapAddFacilityFormValues[K]>;
};
