import type { HydraItem } from '@core/api/models';

/**
 * Interface FacilityGeocodeOutput
 * @interface FacilityGeocodeOutput
 *
 * @description
 * One address match answered by
 * `GET /api/organizations/{organizationId}/facilities/geocode`, mirroring
 * the backend `GeocodeAddressOutput`. `displayName` is the provider's
 * canonical name for the match and doubles as the operation's identifier —
 * a geocode lookup has no natural id.
 *
 * @since 1.0.0
 */
export interface FacilityGeocodeOutput extends HydraItem {
  //#region Properties
  /** The provider's canonical display name for the match. @type {string} */
  readonly displayName: string;

  /** The match's latitude, decimal degrees. @type {number} */
  readonly latitude: number;

  /** The match's longitude, decimal degrees. @type {number} */
  readonly longitude: number;
  //#endregion
}
