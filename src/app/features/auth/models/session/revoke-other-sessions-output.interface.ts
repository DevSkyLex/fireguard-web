import type { HydraItem } from '@core/api/models';

/**
 * Interface RevokeOtherSessionsOutput
 * @interface RevokeOtherSessionsOutput
 *
 * @description
 * Response of `POST /api/sessions/revoke-others`: how many sessions were
 * revoked, the caller's current one excluded. Zero when there was nothing
 * else to revoke — the operation is idempotent.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface RevokeOtherSessionsOutput extends HydraItem {
  /** Number of sessions revoked, excluding the caller's current session. */
  readonly revokedCount: number;
}
