import {
  resolveInterventionTag,
  type InterventionWorkItemStatus,
} from '@features/organization/features/interventions/models';
import type { TagDescriptor } from '@shared/components';
import type { WorkItemStatusOption } from '../models';

/**
 * Constant WORK_ITEM_STATUS_FILTER_VALUES
 * @const WORK_ITEM_STATUS_FILTER_VALUES
 *
 * @description
 * Ordered work item status values offered by the table status filter
 * (planned → skipped).
 *
 * @since 1.0.0
 *
 * @type {readonly InterventionWorkItemStatus[]}
 */
const WORK_ITEM_STATUS_FILTER_VALUES: readonly InterventionWorkItemStatus[] = [
  'planned',
  'in_progress',
  'completed',
  'skipped',
];

/**
 * Constant WORK_ITEM_STATUS_OPTIONS
 * @const WORK_ITEM_STATUS_OPTIONS
 *
 * @description
 * Status filter options for the work item table, resolved once from the
 * intervention tag registry so labels, severities and icons stay the single
 * source of truth.
 *
 * @since 1.0.0
 *
 * @type {WorkItemStatusOption[]}
 */
export const WORK_ITEM_STATUS_OPTIONS: WorkItemStatusOption[] = WORK_ITEM_STATUS_FILTER_VALUES.map(
  (value: InterventionWorkItemStatus): WorkItemStatusOption => {
    const descriptor: TagDescriptor = resolveInterventionTag('workItemStatus', value);

    return { label: descriptor.label, severity: descriptor.severity, icon: descriptor.icon, value };
  },
);
