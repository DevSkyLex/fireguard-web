import type { HydraItem } from '@core/api/models';
import type { FacilityAddressSuggestion } from './facility-address-suggestion.interface';

/**
 * Interface FacilityAddressSuggestionsOutput
 * @interface FacilityAddressSuggestionsOutput
 * @description Bounded collection of address suggestions; members are provider value objects, not persisted facilities.
 * @since 1.0.0
 */
export interface FacilityAddressSuggestionsOutput extends HydraItem {
  /**
   * Property member
   * @readonly
   * @description At most five matching addresses, in provider relevance order.
   * @access public
   * @since 1.0.0
   * @type {readonly FacilityAddressSuggestion[]}
   */
  readonly member: readonly FacilityAddressSuggestion[];
  /**
   * Property totalItems
   * @readonly
   * @description Number of returned address suggestions.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly totalItems: number;
}
