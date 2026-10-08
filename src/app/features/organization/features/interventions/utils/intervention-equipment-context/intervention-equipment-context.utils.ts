import type { InterventionEquipmentContext } from '../../models/intervention-equipment-context/intervention-equipment-context.interface';
import type { InterventionWorkItemAction } from '../../models/intervention-work-item/intervention-work-item-action.type';

/**
 * Function resolveInterventionEquipmentContext
 *
 * @description
 * Validates equipment-dossier route hints before they can seed a planning draft.
 *
 * @access public
 * @since unreleased
 *
 * @param {string | undefined} equipmentId - Equipment UUID from the route query.
 * @param {string | undefined} workAction - Supported equipment work action.
 * @param {string | undefined} siteId - Optional root-site UUID.
 *
 * @returns {InterventionEquipmentContext | null} Safe preparation context or no context.
 */
export function resolveInterventionEquipmentContext(
  equipmentId: string | undefined,
  workAction: string | undefined,
  siteId?: string,
): InterventionEquipmentContext | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const action = workAction ?? 'inspection';
  if (
    !equipmentId ||
    !uuid.test(equipmentId) ||
    !['inspection', 'maintenance', 'repair', 'replacement'].includes(action)
  )
    return null;
  return {
    target: `/api/equipment/${equipmentId}`,
    action: action as InterventionWorkItemAction,
    site: siteId && uuid.test(siteId) ? `/api/facilities/${siteId}` : '',
  };
}
