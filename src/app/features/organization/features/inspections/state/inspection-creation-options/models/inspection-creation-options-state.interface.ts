import type { CallState } from '@core/request-state';
import type { SelectOption } from '@features/organization/features/inspections/models';

/**
 * Interface InspectionCreationOptionsState
 *
 * @description
 * State consumed by the inspection creation form's equipment picker.
 *
 * @since 1.0.0
 */
export interface InspectionCreationOptionsState {
  /** The organization's equipment, offered by `InspectionCreateForm`'s combobox. */
  readonly equipmentOptions: readonly SelectOption[];

  /** Lifecycle of the options load (pending / success / error). */
  readonly loadCallState: CallState;
}
