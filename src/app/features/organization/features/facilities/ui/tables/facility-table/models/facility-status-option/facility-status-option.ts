import type { FacilityStatus } from '@features/organization/features/facilities/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Interface FacilityStatusOption
 * @interface FacilityStatusOption
 *
 * @description
 * Display metadata used to render facility status badges consistently in the
 * facility table and its filters. Extends the shared {@link TagDescriptor}
 * (`label`, `severity`, `icon`) so it can be forwarded directly to
 * `<app-tag>`, and adds the API `value` sent in list filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityStatusOption extends TagDescriptor {
  //#region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Facility status value sent by the API.
   *
   * @type {FacilityStatus}
   */
  readonly value: FacilityStatus;
  //#endregion
}
