import type { OrganizationNotificationSettings } from '../organization-settings/organization-notification-settings.interface';
import type { OrganizationRegionalSettings } from '../organization-settings/organization-regional-settings.interface';

/**
 * Interface UpdateOrganizationInput
 * @interface UpdateOrganizationInput
 *
 * @description
 * Partial payload used to update an organization's settings. Every field is
 * optional; only the provided fields are applied. Sending an empty
 * `description` clears it. The `notifications` and `regional` slices carry
 * partial section payloads applied on top of the current settings.
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
  //#endregion
}
