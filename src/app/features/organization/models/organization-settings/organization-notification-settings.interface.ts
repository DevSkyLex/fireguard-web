/**
 * Interface OrganizationNotificationSettings
 * @interface OrganizationNotificationSettings
 *
 * @description
 * Organization-wide notification policy: the enabled delivery channels and the
 * event categories that generate notifications.
 */
export interface OrganizationNotificationSettings {
  //#region Properties
  /** @type {boolean} */
  readonly emailEnabled: boolean;
  /** @type {boolean} */
  readonly inAppEnabled: boolean;
  /** @type {boolean} */
  readonly interventionPublished: boolean;
  /** @type {boolean} */
  readonly interventionAssigned: boolean;
  /** @type {boolean} */
  readonly inspectionDue: boolean;
  /** @type {boolean} */
  readonly nonConformityOpened: boolean;
  /** @type {boolean} */
  readonly nonConformitySlaBreached: boolean;
  /** @type {boolean} */
  readonly weeklyDigest: boolean;
  /** @type {boolean} */
  readonly memberInvited: boolean;
  //#endregion
}
