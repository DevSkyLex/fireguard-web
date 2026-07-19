import type { HydraItem } from '@core/api/models';
import type { OrganizationSettings } from '../organization-settings/organization-settings.interface';

/**
 * Interface OrganizationOutput
 * @interface OrganizationOutput
 *
 * @description
 * Organization resource returned by the API.
 */
export interface OrganizationOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly slug: string;
  /** @type {string} */
  readonly ownerUserId: string;
  /** @type {string} */
  readonly createdByUserId: string;
  /** @type {string} */
  readonly status: string;
  /** @type {boolean} */
  readonly isActive: boolean;
  /** @type {(string | null | undefined)} */
  readonly description?: string | null;
  /** @type {(string | null | undefined)} */
  readonly logoUrl?: string | null;
  /** @type {number} */
  readonly memberCount: number;
  /** @type {(OrganizationSettings | null | undefined)} */
  readonly settings?: OrganizationSettings | null;
  /** @type {(string | null | undefined)} */
  readonly planId?: string | null;
  /** @type {(string | null | undefined)} */
  readonly planName?: string | null;
  /**
   * Legal profile, used on reports, invoices and compliance exports. Every
   * field is optional: an organization is usable long before its legal
   * identity is filled in.
   *
   * @type {(string | null | undefined)}
   */
  readonly country?: string | null;
  /** @type {(string | null | undefined)} */
  readonly legalType?: string | null;
  /** Registered name, which may differ from the display name. @type {(string | null | undefined)} */
  readonly legalName?: string | null;
  /** @type {(string | null | undefined)} */
  readonly registrationNumber?: string | null;
  /** @type {(string | null | undefined)} */
  readonly vatNumber?: string | null;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
