import type { HydraItem } from '@core/api/models';

/**
 * Interface PortalSessionOutput
 * @interface PortalSessionOutput
 *
 * @description
 * Hosted Billing Portal URL the client must redirect the user to.
 */
export interface PortalSessionOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly url: string;
  //#endregion
}
