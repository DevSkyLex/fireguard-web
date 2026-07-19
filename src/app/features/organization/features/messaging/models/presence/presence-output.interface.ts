import type { HydraItem } from '@core/api/models';

/**
 * Whether a member is currently online.
 *
 * @since 1.0.0
 */
export interface PresenceOutput extends HydraItem {
  readonly memberId: string;
  readonly online: boolean;
  readonly lastSeenAt: string | null;
}
