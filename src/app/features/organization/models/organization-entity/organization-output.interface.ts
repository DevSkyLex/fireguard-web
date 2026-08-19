import type { HydraItem } from '@core/api/models';
import type { OrganizationSettings } from '../organization-settings/organization-settings.interface';
import type { OrganizationMembershipRoleOutput } from './organization-membership-role-output.interface';

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
   * Legal country of the organization (ISO 3166-1 alpha-2). Part of the
   * optional legal profile used on reports, invoices and compliance
   * documents.
   *
   * @type {(string | null | undefined)}
   */
  readonly country?: string | null;
  /**
   * Legal entity type — see `GET /api/organizations/legal-types` for the
   * supported values and their labels.
   *
   * @type {(string | null | undefined)}
   */
  readonly legalType?: string | null;
  /**
   * Registered legal name, which may differ from the organization's display
   * `name`.
   *
   * @type {(string | null | undefined)}
   */
  readonly legalName?: string | null;
  /**
   * Company/registration number in the jurisdiction identified by
   * {@link country}.
   *
   * @type {(string | null | undefined)}
   */
  readonly registrationNumber?: string | null;
  /** @type {(string | null | undefined)} */
  readonly vatNumber?: string | null;
  /**
   * Whether the authenticated user owns this organization. Resolved only on
   * the user's organization list (`GET /api/organizations`); `undefined`/`null`
   * on every other read or mutation response, including the single-organization
   * `GET` this app's `ActiveOrganizationStore` uses — mirroring the same
   * caveat already documented for `OrganizationMemberOutput.isOwner`.
   *
   * @type {(boolean | null | undefined)}
   */
  readonly isOwner?: boolean | null;
  /**
   * Organization roles assigned to the authenticated user's membership.
   * Resolved under the same conditions as {@link isOwner}.
   *
   * @type {(ReadonlyArray<OrganizationMembershipRoleOutput> | null | undefined)}
   */
  readonly roles?: ReadonlyArray<OrganizationMembershipRoleOutput> | null;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
