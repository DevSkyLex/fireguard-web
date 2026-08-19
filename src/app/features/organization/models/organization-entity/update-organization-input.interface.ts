import type { OrganizationAssistantSettings } from '../organization-settings/organization-assistant-settings.interface';
import type { OrganizationAutomationSettings } from '../organization-settings/organization-automation-settings.interface';
import type { OrganizationComplianceSettings } from '../organization-settings/organization-compliance-settings.interface';
import type { OrganizationNotificationSettings } from '../organization-settings/organization-notification-settings.interface';
import type { OrganizationRegionalSettings } from '../organization-settings/organization-regional-settings.interface';

/**
 * Interface UpdateOrganizationInput
 * @interface UpdateOrganizationInput
 *
 * @description
 * Partial payload used to update an organization's settings. Every field is
 * optional; only the provided fields are applied. Sending an empty
 * `description` clears it. The `notifications`, `regional`, `compliance`,
 * `automation` and `assistant` slices carry partial section payloads applied
 * on top of the current settings — `compliance` omits the two read-only
 * `customized*` hints, which the API never accepts as input. There is no
 * `approval` slice: the four-eyes approval policy is read-only on this page
 * until the approvals inbox exists to act on a gated request.
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
  /** @type {(Partial<OrganizationAssistantSettings> | undefined)} */
  readonly assistant?: Partial<OrganizationAssistantSettings>;
  //#endregion
}
