import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityHierarchyNodeData
 * @interface FacilityHierarchyNodeData
 *
 * @description
 * Payload carried by every {@link import('primeng/api').TreeNode} rendered in
 * the facility hierarchy organization chart. A node is either a real facility
 * node (carrying its {@link FacilityOutput}) or a transient placeholder shown
 * while a branch's children are being lazily loaded.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityHierarchyNodeData {
  /**
   * Property facility
   *
   * @description
   * The facility represented by the node, or `null` for placeholder nodes.
   *
   * @since 1.0.0
   *
   * @type {FacilityOutput | null}
   */
  readonly facility: FacilityOutput | null;

  /**
   * Property placeholder
   *
   * @description
   * Whether the node is a transient skeleton placeholder used to render the
   * expand toggle for a branch whose children have not been fetched yet.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly placeholder: boolean;

  /**
   * Property loading
   *
   * @description
   * Whether the children of the node's facility are currently being fetched.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly loading: boolean;
}
