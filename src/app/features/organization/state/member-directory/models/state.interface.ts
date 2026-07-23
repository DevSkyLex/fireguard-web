import type { CallState } from '@core/request-state';
import type { MemberDirectoryEntry } from '@features/organization/models';

/**
 * Interface MemberDirectoryState
 * @interface MemberDirectoryState
 *
 * @description
 * State of {@link MemberDirectoryStore}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MemberDirectoryState {
  /** Organization the loaded directory belongs to, or `null` before any load. */
  readonly organizationId: string | null;
  /** Loaded members, keyed by bare member id. */
  readonly byId: ReadonlyMap<string, MemberDirectoryEntry>;
  readonly callState: CallState;
}
