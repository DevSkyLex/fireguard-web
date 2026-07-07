import type { HydraItem } from '@core/api/models';

/**
 * Interface RemoveOrganizationMembersResult
 * @interface RemoveOrganizationMembersResult
 *
 * @description
 * Outcome of a batch member removal: the IDs actually removed and the IDs that
 * failed, so the client can prune precisely and report a partial failure.
 */
export interface RemoveOrganizationMembersResult extends HydraItem {
  /** @type {ReadonlyArray<string>} */
  readonly removedIds: ReadonlyArray<string>;
  /** @type {ReadonlyArray<string>} */
  readonly failedIds: ReadonlyArray<string>;
}
