import {
  type InterventionType,
  resolveInterventionTag,
} from '@features/organization/features/interventions/models';
import { TagDescriptor } from '@shared/components/tag/models/tag-descriptor.interface';
import type { InterventionTypeOption } from '../models';

/**
 * Constant INTERVENTION_TYPE_FILTER_VALUES
 * @const INTERVENTION_TYPE_FILTER_VALUES
 *
 * @description
 * Ordered objective type values offered by the table's type filter.
 *
 * @since 1.4.0
 *
 * @type {readonly InterventionType[]}
 */
const INTERVENTION_TYPE_FILTER_VALUES: readonly InterventionType[] = [
  'site_setup',
  'inventory',
  'inspection_campaign',
];

/**
 * Constant INTERVENTION_TYPE_OPTIONS
 * @const INTERVENTION_TYPE_OPTIONS
 *
 * @description
 * Type filter options for the intervention table, resolved once from the
 * intervention tag registry so labels, severities and icons stay the single
 * source of truth.
 *
 * @since 1.4.0
 *
 * @type {InterventionTypeOption[]}
 */
export const INTERVENTION_TYPE_OPTIONS: InterventionTypeOption[] =
  INTERVENTION_TYPE_FILTER_VALUES.map((value: InterventionType): InterventionTypeOption => {
    const descriptor: TagDescriptor = resolveInterventionTag('type', value);

    return {
      label: descriptor.label,
      severity: descriptor.severity,
      icon: descriptor.icon,
      value: value,
    };
  });
