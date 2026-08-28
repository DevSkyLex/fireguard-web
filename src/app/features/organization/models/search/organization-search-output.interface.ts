import type { HydraItem } from '@core/api/models';
import type { OrganizationSearchHitOutput } from './organization-search-hit-output.interface';

/**
 * Interface OrganizationSearchOutput
 * @interface OrganizationSearchOutput
 *
 * @description
 * Response of `GET /organizations/{organizationId}/search?q=…`: the
 * normalized (trimmed) term the results answer, and a flat list of at most
 * 5 hits per type in stable type order (equipment, facility, intervention,
 * inspection, non_conformity). Types the caller cannot read are silently
 * omitted.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSearchOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly query: string;
  /** @type {readonly OrganizationSearchHitOutput[]} */
  readonly results: readonly OrganizationSearchHitOutput[];
  //#endregion
}
