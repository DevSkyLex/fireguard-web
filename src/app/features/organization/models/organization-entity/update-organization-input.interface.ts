import type { OrganizationAssistantSettings } from '../organization-settings/organization-assistant-settings.interface';
import type { OrganizationAutomationSettings } from '../organization-settings/organization-automation-settings.interface';
import type { OrganizationComplianceSettings } from '../organization-settings/organization-compliance-settings.interface';
import type { OrganizationNotificationSettings } from '../organization-settings/organization-notification-settings.interface';
import type { OrganizationRegionalSettings } from '../organization-settings/organization-regional-settings.interface';
import type { UpdateOrganizationApprovalInput } from '../organization-settings/update-organization-approval-input.interface';

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
 *
 * The five legal-profile fields (`country`, `legalType`, `legalName`,
 * `registrationNumber`, `vatNumber`) each clear on an **empty string**, not
 * `null` like `description` above. Omit a field to leave it unchanged.
 */
export interface UpdateOrganizationInput {
  //#region Properties
  /** @type {(string | undefined)} */
  readonly name?: string;
  /** @type {(string | undefined)} */
  readonly slug?: string;
  /** @type {(string | null | undefined)} */
  readonly description?: string | null;
  /** @type {(boolean | undefined)} */
  readonly isActive?: boolean;
  /** @type {(Partial<OrganizationNotificationSettings> | undefined)} */
  readonly notifications?: Partial<OrganizationNotificationSettings>;
  /** @type {(Partial<OrganizationRegionalSettings> | undefined)} */
  readonly regional?: Partial<OrganizationRegionalSettings>;
  /** @type {(Partial<Pick<OrganizationComplianceSettings, 'nonConformitySlaDays' | 'inspectionPeriodicityDefaults' | 'reminderWindowDays'>> | undefined)} */
  readonly compliance?: Partial<
    Pick<
      OrganizationComplianceSettings,
      'nonConformitySlaDays' | 'inspectionPeriodicityDefaults' | 'reminderWindowDays'
    >
  >;
  /** @type {(Partial<OrganizationAutomationSettings> | undefined)} */
  readonly automation?: Partial<OrganizationAutomationSettings>;
  /** @type {(UpdateOrganizationApprovalInput | undefined)} */
  readonly approval?: UpdateOrganizationApprovalInput;
  /** @type {(Partial<OrganizationAssistantSettings> | undefined)} */
  readonly assistant?: Partial<OrganizationAssistantSettings>;
  /** ISO 3166-1 alpha-2 legal country code. Empty string clears it. @type {(string | undefined)} */
  readonly country?: string;
  /** See `GET /api/organizations/legal-types`. Empty string clears it. @type {(string | undefined)} */
  readonly legalType?: string;
  /** @type {(string | undefined)} Empty string clears it. */
  readonly legalName?: string;
  /** @type {(string | undefined)} Empty string clears it. */
  readonly registrationNumber?: string;
  /** @type {(string | undefined)} Empty string clears it. */
  readonly vatNumber?: string;
  //#endregion
}
