import {
  type InterventionStatus,
  resolveInterventionTag,
} from '@features/organization/features/interventions/models';
import type { InterventionStatusOption } from '../models';
import { TagDescriptor } from '@shared/components/tag/models/tag-descriptor.interface';

/**
 * Constant INTERVENTION_STATUS_FILTER_VALUES
 * @const INTERVENTION_STATUS_FILTER_VALUES
 *
 * @description
 * Ordered workflow status values offered by the table status filter
 * (draft → published → abandoned).
 *
 * @since 1.1.0
 *
 * @type {readonly InterventionStatus[]}
 */
const INTERVENTION_STATUS_FILTER_VALUES: readonly InterventionStatus[] = [
  'draft',
  'planned',
  'in_progress',
  'submitted',
  'changes_requested',
  'published',
  'abandoned',
];

/**
 * Constant INTERVENTION_STATUS_OPTIONS
 * @const INTERVENTION_STATUS_OPTIONS
 *
 * @description
 * Status filter options for the intervention table, resolved once from the
 * intervention tag registry so labels, severities and icons stay the single
 * source of truth.
 *
 * @since 1.1.0
 *
 * @type {InterventionStatusOption[]}
 */
export const INTERVENTION_STATUS_OPTIONS: InterventionStatusOption[] =
  INTERVENTION_STATUS_FILTER_VALUES.map((value: InterventionStatus): InterventionStatusOption => {
    const descriptor: TagDescriptor = resolveInterventionTag('status', value);

    return {
      label: descriptor.label,
      severity: descriptor.severity,
      icon: descriptor.icon,
      value: value,
    };
  });
