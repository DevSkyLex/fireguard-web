import type { HydraItem } from '@core/models/api';

/**
 * Interface OrganizationCountryOutput
 * @interface OrganizationCountryOutput
 *
 * @description
 * Country option returned by the organization API.
 */
export interface OrganizationCountryOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly code: string;
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly flagUrl: string;
  //#endregion
}
