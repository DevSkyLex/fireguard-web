import type { CallState } from '@core/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityTreeState
 * @interface FacilityTreeState
 *
 * @description
 * State of the asset explorer's site tree.
 * Branches are loaded lazily, one parent at a time, because an organization's
 * site hierarchy can be deep and the operator only ever opens a path through
 * it. The API already exposes the two calls this needs — roots, then a node's
 * children — so nothing here fetches a subtree it was not asked for.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityTreeState {
  /**
   * Property customerId
   * @readonly
   *
   * @description
   * Internal customer currently narrowing root sites; descendants follow those roots.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly customerId: string | null;

  //#region Properties
  /**
   * Property organizationId
   *
   * @description
   * Organization owning these root and branch pages.
   */
  readonly organizationId: string | null;
  /**
   * Property rootsPage
   *
   * @description
   * Last successfully loaded root page.
   */
  readonly rootsPage: number;
  /**
   * Property rootsTotal
   *
   * @description
   * Server total of root nodes.
   */
  readonly rootsTotal: number;
  /**
   * Property childPagesByParent
   *
   * @description
   * Last successfully loaded page for each expanded parent.
   */
  readonly childPagesByParent: Readonly<Record<string, number>>;
  /**
   * Property childTotalsByParent
   *
   * @description
   * Server child count for each expanded parent.
   */
  readonly childTotalsByParent: Readonly<Record<string, number>>;

  /**
   * Property rootsCallState
   *
   * @description
   * The top of the hierarchy: sites with no parent.
   */
  readonly rootsCallState: CallState<readonly FacilityOutput[]>;

  /**
   * Property childrenByParent
   *
   * @description
   * Children already fetched, keyed by their parent's identifier.
   */
  readonly childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>;

  /**
   * Property expandingParentIds
   *
   * @description
   * Identifiers of the parents whose children are in flight.
   */
  readonly expandingParentIds: readonly string[];

  /**
   * Property failedParentIds
   *
   * @description
   * Identifiers of the parents whose children failed to load.
   */
  readonly failedParentIds: readonly string[];

  /**
   * @description
   * The last drag-drop re-parent request, tracked so the primitive can be locked while one is in
   * flight.
   */
  /**
   * Property moveRevisionCallState
   *
   * @description
   * Tracks the revision reload required after a move conflict.
   */
  readonly moveRevisionCallState: CallState;

  /**
   * Property moveCallState
   *
   * @description
   * Stores moveCallState.
   */
  readonly moveCallState: CallState<FacilityOutput>;

  /**
   * Property duplicateCallState
   *
   * @description
   * The last duplicate request, tracked so the menu action can be locked while one is in flight.
   */
  readonly duplicateCallState: CallState<FacilityOutput>;
  //#endregion
}
