import type { CallState } from '@core/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityTreeState
 * @interface FacilityTreeState
 *
 * @description
 * State of the asset explorer's site tree.
 *
 * Branches are loaded lazily, one parent at a time, because an organization's
 * site hierarchy can be deep and the operator only ever opens a path through
 * it. The API already exposes the two calls this needs — roots, then a node's
 * children — so nothing here fetches a subtree it was not asked for.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityTreeState {
  //#region Properties
  /** The top of the hierarchy: sites with no parent. */
  readonly rootsCallState: CallState<readonly FacilityOutput[]>;

  /** Children already fetched, keyed by their parent's identifier. */
  readonly childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>;

  /** Identifiers of the parents whose children are in flight. */
  readonly expandingParentIds: readonly string[];

  /** Identifiers of the parents whose children failed to load. */
  readonly failedParentIds: readonly string[];
  //#endregion
}
