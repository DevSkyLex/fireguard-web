import type { HydraItem } from '@core/api/models';
import type { FacilityTreeNode } from './facility-tree-node.interface';

/**
 * The `FacilityTree` resource: the organization's root facilities, each nesting
 * its own children recursively.
 *
 * @since 1.0.0
 */
export interface FacilityTreeOutput extends HydraItem {
  readonly nodes: readonly FacilityTreeNode[];
}
