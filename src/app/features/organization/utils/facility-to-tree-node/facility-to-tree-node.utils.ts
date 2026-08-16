import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { TreeNode } from '@shared/tree';

/**
 * Function facilityToTreeNode
 *
 * @description
 * Maps a `FacilityOutput` onto the generic `TreeNode<FacilityOutput>` shape
 * the shared `Tree` primitive renders: the facility's name becomes the
 * label, `hasChildren` carries over as-is, and the record itself rides
 * along as `data` for the assets explorer's node template and selection
 * handlers.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {FacilityOutput} facility - The facility to map.
 *
 * @returns {TreeNode<FacilityOutput>} The equivalent tree node.
 */
export function facilityToTreeNode(facility: FacilityOutput): TreeNode<FacilityOutput> {
  return {
    id: facility.id,
    label: facility.name,
    hasChildren: facility.hasChildren,
    data: facility,
  };
}
