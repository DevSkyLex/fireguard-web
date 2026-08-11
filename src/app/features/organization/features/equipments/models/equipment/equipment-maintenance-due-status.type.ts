/**
 * Type EquipmentMaintenanceDueStatus
 *
 * @description
 * How close an equipment's next scheduled maintenance is, resolved
 * cross-module from the Maintenance module. `unscheduled` is the default
 * when the equipment carries no maintenance schedule at all — it is not a
 * fifth compliance state, only the absence of one.
 */
export type EquipmentMaintenanceDueStatus = 'unscheduled' | 'up_to_date' | 'due_soon' | 'overdue';
