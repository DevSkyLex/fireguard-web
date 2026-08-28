import type { HydraItem } from '@core/api/models';

/**
 * Interface TeamMemberOutput
 * @interface TeamMemberOutput
 *
 * @description
 * A team membership row (`GET /organizations/{organizationId}/teams/{teamId}/members`).
 * `role` is a free-form membership label (e.g. `"lead"`) set by the caller —
 * it is not an RBAC role and carries no permission.
 *
 * @since 1.0.0
 */
export interface TeamMemberOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly memberId: string;
  /** Free-form membership label, e.g. `"lead"`. Not an RBAC role. */
  readonly role?: string;
  /** @type {string} */
  readonly addedAt: string;
  //#endregion
}
