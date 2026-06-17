import {
  type InterventionType,
  resolveInterventionTag,
} from '@features/organization/features/interventions/models';

/**
 * Function getInterventionTypeIcon
 * @function getInterventionTypeIcon
 *
 * @description
 * Resolves the PrimeIcon class matching an intervention objective type through
 * the intervention tag registry, keeping icon ownership in a single source.
 *
 * @since 1.1.0
 *
 * @param {InterventionType} type - Intervention objective type.
 *
 * @returns {string} PrimeIcon class string.
 */
export function getInterventionTypeIcon(type: InterventionType): string {
  return resolveInterventionTag('type', type).icon;
}
