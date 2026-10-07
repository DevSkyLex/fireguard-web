import type { OrganizationAssistantSettings } from '../organization-settings/organization-assistant-settings.interface';
import type { OrganizationAutomationSettings } from '../organization-settings/organization-automation-settings.interface';
import type { OrganizationComplianceSettings } from '../organization-settings/organization-compliance-settings.interface';
import type { OrganizationNotificationSettings } from '../organization-settings/organization-notification-settings.interface';
import type { OrganizationRegionalSettings } from '../organization-settings/organization-regional-settings.interface';
import type { UpdateOrganizationApprovalInput } from '../organization-settings/update-organization-approval-input.interface';
import type { OrganizationRegisteredAddress } from './organization-registered-address.interface';

/**
 * Interface UpdateOrganizationInput
 * @interface UpdateOrganizationInput
 *
 * @description
 * Partial payload used to update an organization's settings. Every field is
 * optional; only the provided fields are applied. Sending an empty
 * `description` clears it. The `notifications`, `regional`, `compliance`,
 * `automation`, `approval` and `assistant` slices carry partial section
 * payloads applied on top of the current settings — `compliance` omits the
 * two read-only `customized*` hints, which the API never accepts as input.
 * `approval` is now writable: the approvals inbox
 * (`features/approvals/FEATURE.md`) gives a reader a surface to act on a
 * gated request, which is what the read-only restriction was waiting on.
 * The five legal-profile fields (`country`, `legalType`, `legalName`,
 * `registrationNumber`, `vatNumber`) each clear on an **empty string**, not
 * `null` like `description` above. Omit a field to leave it unchanged.
 */
export interface UpdateOrganizationInput {
  //#region Properties
  /**
   * Property name
   *
   * @description
   * Organization display name.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly name?: string;

  /**
   * Property operatingProfile
   *
   * @description
   * Changes operational defaults without granting permissions.
   *
   * @property operatingProfile
   */
  readonly operatingProfile?: 'operator' | 'service_provider' | null;

  /**
   * Property slug
   *
   * @description
   * Organization URL identifier.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly slug?: string;

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
   * Property isActive
   *
   * @description
   * Whether the organization is currently active.
   *
   * @access public
   *
   * @type {boolean | undefined}
   */
  readonly isActive?: boolean;

  /**
   * Property notifications
   *
   * @description
   * Partial notification policy update.
   *
   * @access public
   *
   * @type {Partial<OrganizationNotificationSettings> | undefined}
   */
  readonly notifications?: Partial<OrganizationNotificationSettings>;

  /**
   * Property regional
   *
   * @description
   * Partial regional display policy update.
   *
   * @access public
   *
   * @type {Partial<OrganizationRegionalSettings> | undefined}
   */
  readonly regional?: Partial<OrganizationRegionalSettings>;

  /**
   * Property compliance
   *
   * @description
   * Partial operational follow-up policy update; server-only customization hints are excluded.
   *
   * @access public
   *
   * @type {Partial<
   *       Pick<
   *         OrganizationComplianceSettings,
   *         'nonConformitySlaDays' | 'inspectionPeriodicityDefaults' | 'reminderWindowDays'
   *       >
   *     >
   *   | undefined}
   */
  readonly compliance?: Partial<
    Pick<
      OrganizationComplianceSettings,
      'nonConformitySlaDays' | 'inspectionPeriodicityDefaults' | 'reminderWindowDays'
    >
  >;

  /**
   * Property automation
   *
   * @description
   * Partial automation policy update.
   *
   * @access public
   *
   * @type {Partial<OrganizationAutomationSettings> | undefined}
   */
  readonly automation?: Partial<OrganizationAutomationSettings>;

  /**
   * Property approval
   *
   * @description
   * Organization approval-policy update.
   *
   * @access public
   *
   * @type {UpdateOrganizationApprovalInput | undefined}
   */
  readonly approval?: UpdateOrganizationApprovalInput;

  /**
   * Property assistant
   *
   * @description
   * Partial assistant policy update.
   *
   * @access public
   *
   * @type {Partial<OrganizationAssistantSettings> | undefined}
   */
  readonly assistant?: Partial<OrganizationAssistantSettings>;

  /**
   * Property country
   *
   * @description
   * ISO 3166-1 alpha-2 legal country code. Empty string clears it. @type {(string | undefined)}
   *
   * @access public
   */
  readonly country?: string;

  /**
   * Property legalType
   *
   * @description
   * See `GET /api/organizations/legal-types`. Empty string clears it. @type {(string | undefined)}
   *
   * @access public
   */
  readonly legalType?: string;

  /**
   * Property legalName
   *
   * @description
   * Registered legal name; an empty string clears it.
   *
   * @access public
   *
   * @type {string | undefined} Empty string clears it.
   */
  readonly legalName?: string;

  /**
   * Property registrationNumber
   *
   * @description
   * Entity registration identifier; an empty string clears it.
   *
   * @access public
   *
   * @type {string | undefined} Empty string clears it.
   */
  readonly registrationNumber?: string;

  /**
   * Property vatNumber
   *
   * @description
   * Optional VAT identifier.
   *
   * @access public
   *
   * @type {string | undefined} Empty string clears it.
   */
  readonly vatNumber?: string;

  /**
   * Property registeredAddress
   *
   * @description
   * Omission or null preserves the address; an object replaces it and an empty object clears it.
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
   * Omission or null preserves the contact; an empty string clears it.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly privacyContactEmail?: string | null;
  //#endregion
}
