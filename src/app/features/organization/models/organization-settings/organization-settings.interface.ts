import type { OrganizationNotificationSettings } from './organization-notification-settings.interface';
import type { OrganizationRegionalSettings } from './organization-regional-settings.interface';

/**
 * Interface OrganizationSettings
 * @interface OrganizationSettings
 *
 * @description
 * Structured organization preferences returned by the API, grouping the
 * per-concern sub-sections (notifications, regional).
 */
export interface OrganizationSettings {
  //#region Properties
  /** @type {OrganizationNotificationSettings} */
  readonly notifications: OrganizationNotificationSettings;
  /** @type {OrganizationRegionalSettings} */
  readonly regional: OrganizationRegionalSettings;
  //#endregion
}
