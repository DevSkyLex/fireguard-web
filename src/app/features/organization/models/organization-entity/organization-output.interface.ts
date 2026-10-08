import type { HydraItem } from '@core/api/models';
import type { OrganizationSettings } from '../organization-settings/organization-settings.interface';
import type { OrganizationMembershipRoleOutput } from './organization-membership-role-output.interface';
import type { OrganizationRegisteredAddress } from './organization-registered-address.interface';

/**
 * Interface OrganizationOutput
 * @interface OrganizationOutput
 *
 * @description
 * Organization resource returned by the API.
 */
export interface OrganizationOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   *
   * @description
   * Stable organization identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   *
   * @description
   * Organization display name.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property operatingProfile
   *
   * @description
   * Operational defaults; absent responses from an older API use operator.
   *
   * @property operatingProfile
   */
  readonly operatingProfile?: 'operator' | 'service_provider';

  /**
   * Property slug
   *
   * @description
   * Organization URL identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly slug: string;

  /**
   * Property ownerUserId
   *
   * @description
   * User identifier owning the organization in the application.
   *
   * @access public
   *
   * @type {string}
   */
  readonly ownerUserId: string;

  /**
   * Property createdByUserId
   *
   * @description
   * User identifier retained for creation attribution.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdByUserId: string;

  /**
   * Property status
   *
   * @description
   * Lifecycle status supplied by the API.
   *
   * @access public
   *
   * @type {string}
   */
  readonly status: string;

  /**
   * Property isActive
   *
   * @description
   * Whether the organization is currently active.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isActive: boolean;

  /**
   * Property description
   *
   * @description
   * Optional organization description.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly description?: string | null;

  /**
   * Property logoUrl
   *
   * @description
   * Optional organization branding image URL.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly logoUrl?: string | null;

  /**
   * Property memberCount
   *
   * @description
   * Member count supplied by the organization resource.
   *
   * @access public
   *
   * @type {number}
   */
  readonly memberCount: number;

  /**
   * Property settings
   *
   * @description
   * Organization-owned policy and presentation settings.
   *
   * @access public
   *
   * @type {OrganizationSettings | null | undefined}
   */
  readonly settings?: OrganizationSettings | null;

  /**
   * Property planId
   *
   * @description
   * Assigned subscription plan identifier when present.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly planId?: string | null;

  /**
   * Property planName
   *
   * @description
   * Assigned subscription plan display name when present.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly planName?: string | null;

  /**
   * Property country
   *
   * @description
   * Legal country of the organization (ISO 3166-1 alpha-2). Part of the
   * optional legal profile used on reports, invoices and compliance
   * documents.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly country?: string | null;

  /**
   * Property legalType
   *
   * @description
   * Legal entity type — see `GET /api/organizations/legal-types` for the
   * supported values and their labels.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly legalType?: string | null;

  /**
   * Property legalName
   *
   * @description
   * Registered legal name, which may differ from the organization's display
   * `name`.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly legalName?: string | null;

  /**
   * Property registrationNumber
   *
   * @description
   * Company/registration number in the jurisdiction identified by
   * {@link country}.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly registrationNumber?: string | null;

  /**
   * Property vatNumber
   *
   * @description
   * Optional VAT identifier.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly vatNumber?: string | null;

  /**
   * Property registeredAddress
   *
   * @description
   * Registered office, distinct from an operational facility address.
   *
   * @access public
   *
   * @type {OrganizationRegisteredAddress | null | undefined}
   */
  readonly registeredAddress?: OrganizationRegisteredAddress | null;

  /**
   * Property privacyContactEmail
   *
   * @description
   * Contact for personal-data processing owned by the organization.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly privacyContactEmail?: string | null;

  /**
   * Property isOwner
   *
   * @description
   * Whether the authenticated user owns this organization. Resolved only on
   * the user's organization list (`GET /api/organizations`); `undefined`/`null`
   * on every other read or mutation response, including the single-organization
   * `GET` this app's `ActiveOrganizationStore` uses — mirroring the same
   * caveat already documented for `OrganizationMemberOutput.isOwner`.
   *
   * @access public
   *
   * @type {boolean | null | undefined}
   */
  readonly isOwner?: boolean | null;

  /**
   * Property roles
   *
   * @description
   * Organization roles assigned to the authenticated user's membership.
   * Resolved under the same conditions as {@link isOwner}.
   *
   * @access public
   *
   * @type {ReadonlyArray<OrganizationMembershipRoleOutput> | null | undefined}
   */
  readonly roles?: ReadonlyArray<OrganizationMembershipRoleOutput> | null;

  /**
   * Property createdAt
   *
   * @description
   * Organization creation timestamp.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   *
   * @description
   * Most recent organization update timestamp.
   *
   * @access public
   *
   * @type {string}
   */
  readonly updatedAt: string;
  //#endregion
}
