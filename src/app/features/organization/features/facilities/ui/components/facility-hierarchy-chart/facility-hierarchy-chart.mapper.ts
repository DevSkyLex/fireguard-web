import type { TreeNode } from 'primeng/api';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { FacilityHierarchyNodeData } from './models';

/**
 * Interface FacilityHierarchyContext
 * @interface FacilityHierarchyContext
 *
 * @description
 * Read-only snapshot of the facility hierarchy state required to build the
 * organization-chart tree. Combines the lazily-loaded children map with the
 * loaded / loading / expanded id sets tracked by the facility store and the
 * chart component.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityHierarchyContext {
  /**
   * Property childrenByParent
   *
   * @description
   * Map of parent facility id to its already-loaded direct children.
   *
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, readonly FacilityOutput[]>>}
   */
  readonly childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>;

  /**
   * Property loadedParentIds
   *
   * @description
   * Ids of parents whose children have already been fetched.
   *
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  readonly loadedParentIds: readonly string[];

  /**
   * Property loadingParentIds
   *
   * @description
   * Ids of parents whose children are currently being fetched.
   *
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  readonly loadingParentIds: readonly string[];

  /**
   * Property expandedIds
   *
   * @description
   * Ids of nodes the user has expanded, used to preserve the open/closed state
   * across tree rebuilds.
   *
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  readonly expandedIds: readonly string[];
}

/**
 * Constant PLACEHOLDER_KEY_SUFFIX
 * @const PLACEHOLDER_KEY_SUFFIX
 *
 * @description
 * Suffix appended to a parent id to build the key of its skeleton placeholder
 * child node.
 *
 * @type {string}
 */
const PLACEHOLDER_KEY_SUFFIX = '::placeholder';

/**
 * Function toFacilityTreeNode
 * @function toFacilityTreeNode
 *
 * @description
 * Recursively maps a {@link FacilityOutput} into a PrimeNG
 * {@link TreeNode}. Nodes flagged with `hasChildren` whose children are not yet
 * loaded receive a single skeleton placeholder child so the expand toggle is
 * rendered. The root node is always expanded; other nodes reflect the
 * `expandedIds` set so the open state survives lazy rebuilds.
 *
 * @since 1.0.0
 *
 * @param {FacilityOutput} facility - Facility to map.
 * @param {FacilityHierarchyContext} context - Hierarchy state snapshot.
 * @param {boolean} isRoot - Whether the facility is the chart root.
 *
 * @returns {TreeNode<FacilityHierarchyNodeData>} The mapped tree node.
 */
export function toFacilityTreeNode(
  facility: FacilityOutput,
  context: FacilityHierarchyContext,
  isRoot: boolean,
): TreeNode<FacilityHierarchyNodeData> {
  const loaded: boolean = context.loadedParentIds.includes(facility.id);
  const loading: boolean = context.loadingParentIds.includes(facility.id);
  const expanded: boolean = isRoot || context.expandedIds.includes(facility.id);

  const node: TreeNode<FacilityHierarchyNodeData> = {
    key: facility.id,
    label: facility.name,
    expanded,
    selectable: false,
    data: { facility, placeholder: false, loading },
  };

  if (facility.hasChildren) {
    if (loaded) {
      const children: readonly FacilityOutput[] = context.childrenByParent[facility.id] ?? [];
      node.children = children.map((child) => toFacilityTreeNode(child, context, false));
    } else {
      node.children = [
        {
          key: `${facility.id}${PLACEHOLDER_KEY_SUFFIX}`,
          selectable: false,
          data: { facility: null, placeholder: true, loading },
        },
      ];
    }
  }

  return node;
}

/**
 * Function toFacilityTreeNodes
 * @function toFacilityTreeNodes
 *
 * @description
 * Builds the single-rooted tree consumed by the facility organization chart
 * from a root facility and the current hierarchy state.
 *
 * @since 1.0.0
 *
 * @param {FacilityOutput | null} root - Root facility, or `null` when unresolved.
 * @param {FacilityHierarchyContext} context - Hierarchy state snapshot.
 *
 * @returns {TreeNode<FacilityHierarchyNodeData>[]} The chart tree (empty when no root).
 */
export function toFacilityTreeNodes(
  root: FacilityOutput | null,
  context: FacilityHierarchyContext,
): TreeNode<FacilityHierarchyNodeData>[] {
  if (!root) {
    return [];
  }

  return [toFacilityTreeNode(root, context, true)];
}
