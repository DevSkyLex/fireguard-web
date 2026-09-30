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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization the loaded directory belongs to, or `null` before any load.
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property byId
   * @readonly
   *
   * @description
   * Loaded members, keyed by bare member id.
   *
   * @type {ReadonlyMap<string, MemberDirectoryEntry>}
   */
  readonly byId: ReadonlyMap<string, MemberDirectoryEntry>;

  /**
   * Property callState
   * @readonly
   *
   * @description
   * Outcome of loading the directory for the selected organization.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState}
   */
  readonly callState: CallState;
}
