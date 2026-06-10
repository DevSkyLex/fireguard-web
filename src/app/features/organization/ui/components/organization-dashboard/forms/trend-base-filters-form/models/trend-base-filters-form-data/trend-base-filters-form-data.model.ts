import type { FormControl } from '@angular/forms';
import type { TrendBaseFiltersFormValues } from '../trend-base-filters-form-values';

/**
 * Type TrendBaseFiltersFormData
 *
 * @description
 * Typed reactive-controls map for the shared dashboard base-filters form.
 *
 * @since 1.0.0
 */
export type TrendBaseFiltersFormData = {
  [K in keyof TrendBaseFiltersFormValues]: FormControl<TrendBaseFiltersFormValues[K]>;
};
