import { INTERVENTION_VIEW_FILTER_KEYS } from '../../constants/intervention-view-filter-keys.constants';
import type { InterventionViewCriteria } from '../../models/intervention-view-criteria.interface';
import type { InterventionView } from '../../models/intervention-view.type';

/**
 * Function resolveInterventionViewCriteria
 *
 * @description
 * Resolves the permitted collection view and its supported filter catalogue.
 * Criteria for other views remain in the URL so returning to those views restores them.
 *
 * @access public
 *
 * @param {string | undefined} requested - Requested route view.
 * @param {boolean} canReadRecurrences - Whether recurring interventions are accessible.
 *
 * @returns {InterventionViewCriteria} Permitted view and its supported criteria.
 */
export function resolveInterventionViewCriteria(
  requested: string | undefined,
  canReadRecurrences: boolean,
): InterventionViewCriteria {
  const view: InterventionView =
    requested === 'board' ||
    requested === 'calendar' ||
    (requested === 'recurrences' && canReadRecurrences)
      ? requested
      : 'list';

  return {
    view,
    filterKeys: INTERVENTION_VIEW_FILTER_KEYS[view],
  };
}
