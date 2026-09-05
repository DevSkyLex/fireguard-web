import type { CallState } from '@core/request-state';
import type {
  InterventionListOptions,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
/**
 * Interface InterventionBoardColumnState
 * @interface InterventionBoardColumnState
 * @description Server page membership and request state for one status.
 * @since 1.0.0
 */
export interface InterventionBoardColumnState {
  /**
   * Property ids
   * @readonly
   * @description Loaded entity identifiers.
   * @since 1.0.0
   * @type {readonly string[]}
   */
  readonly ids: readonly string[];
  /**
   * Property page
   * @readonly
   * @description Last successfully loaded page.
   * @since 1.0.0
   * @type {number}
   */
  readonly page: number;
  /**
   * Property total
   * @readonly
   * @description Exact server total for this status and query.
   * @since 1.0.0
   * @type {number}
   */
  readonly total: number;
  /**
   * Property callState
   * @readonly
   * @description Independent column loading and failure state.
   * @since 1.0.0
   * @type {CallState}
   */
  readonly callState: CallState;
}
/**
 * Interface InterventionBoardState
 * @interface InterventionBoardState
 * @description Board query state independent of the paginated list.
 * @since 1.0.0
 */
export interface InterventionBoardState {
  /**
   * Property columns
   * @readonly
   * @description Status-specific pages.
   * @since 1.0.0
   */
  readonly columns: Partial<Record<InterventionStatus, InterventionBoardColumnState>>;
  /**
   * Property organizationId
   * @readonly
   * @description Active organization.
   * @since 1.0.0
   */
  readonly organizationId: string;
  /**
   * Property options
   * @readonly
   * @description Active shared filters.
   * @since 1.0.0
   */
  readonly options: InterventionListOptions;
  /**
   * Property moves
   * @readonly
   * @description Mutation state per intervention.
   * @since 1.0.0
   */
  readonly moves: Readonly<Record<string, CallState>>;
  /**
   * Property revision
   * @readonly
   * @description Invalidates related calendar observations after successful writes.
   * @since 1.0.0
   */
  readonly revision: number;
}
