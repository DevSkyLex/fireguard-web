import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';

/**
 * Function orderInterventionWorkItems
 * @function orderInterventionWorkItems
 *
 * @description
 * Mirrors the API's stable task order for saved pages and navigation to scanned tasks.
 * Never mutates the complete workspace collection.
 *
 * @since 6.2.0
 *
 * @param {readonly InterventionWorkItemOutput[]} items - Complete matching work items.
 * @param {string | null} prioritizeAssignee - Optional member IRI whose tasks come first.
 * @returns {readonly InterventionWorkItemOutput[]} Tasks ordered by assignee, update date and identifier.
 */
export function orderInterventionWorkItems(
  items: readonly InterventionWorkItemOutput[],
  prioritizeAssignee: string | null = null,
): readonly InterventionWorkItemOutput[] {
  return items.toSorted((left, right) => {
    const priority = prioritizeAssignee
      ? Number(right.assignee === prioritizeAssignee) - Number(left.assignee === prioritizeAssignee)
      : 0;
    if (priority !== 0) return priority;
    const recency = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    if (recency !== 0 && !Number.isNaN(recency)) return recency;
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });
}
