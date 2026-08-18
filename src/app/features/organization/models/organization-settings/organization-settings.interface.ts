import type { OrganizationApprovalSettings } from './organization-approval-settings.interface';
import type { OrganizationAssistantSettings } from './organization-assistant-settings.interface';
import type { OrganizationAutomationSettings } from './organization-automation-settings.interface';
import type { OrganizationComplianceSettings } from './organization-compliance-settings.interface';
import type { OrganizationNotificationSettings } from './organization-notification-settings.interface';
import type { OrganizationRegionalSettings } from './organization-regional-settings.interface';

/**
 * Interface OrganizationSettings
 * @interface OrganizationSettings
 *
 * @description
 * Structured organization preferences returned by the API, grouping the
 * per-concern sub-sections (notifications, regional, compliance, automation,
 * approval, assistant).
 */
export interface OrganizationSettings {
  //#region Properties
  /** @type {OrganizationNotificationSettings} */
  readonly notifications: OrganizationNotificationSettings;
  /** @type {OrganizationRegionalSettings} */
  readonly regional: OrganizationRegionalSettings;
  /** @type {OrganizationComplianceSettings} */
  readonly compliance: OrganizationComplianceSettings;
  /** @type {OrganizationAutomationSettings} */
  readonly automation: OrganizationAutomationSettings;
  /** @type {OrganizationApprovalSettings} */
  readonly approval: OrganizationApprovalSettings;
  /** @type {OrganizationAssistantSettings} */
  readonly assistant: OrganizationAssistantSettings;
  //#endregion
}
