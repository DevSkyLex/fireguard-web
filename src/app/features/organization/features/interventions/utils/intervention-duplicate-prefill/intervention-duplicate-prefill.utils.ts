import type {
  InterventionDuplicatePrefill,
  InterventionOutput,
} from '@features/organization/features/interventions/models';

/**
 * Function buildInterventionDuplicatePrefill
 *
 * @description
 * Projects a source intervention onto the creation sheet's prefill contract:
 * name, objective, priority, site and responsible only — never `status`, the
 * planned window or the review note, since a duplicate opens as a brand new
 * draft, not a copy of the source's lifecycle. The name carries a localized
 * "(copy)" suffix so the two are never mistaken for the same record.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionOutput} intervention - The intervention "Duplicate" was invoked on.
 *
 * @returns {InterventionDuplicatePrefill} The values to seed the creation form with.
 */
export function buildInterventionDuplicatePrefill(
  intervention: InterventionOutput,
): InterventionDuplicatePrefill {
  return {
    name: $localize`:@@intervention.duplicate.nameSuffix:${intervention.name}:name: (copy)`,
    type: intervention.type,
    priority: intervention.priority,
    site: intervention.site ?? '',
    responsible: intervention.responsible ?? '',
  };
}
