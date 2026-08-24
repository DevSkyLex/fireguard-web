/**
 * Maintenance-schedule transport fixtures for the e2e suite, mirroring the
 * backend contract consumed by the maintenance schedule board. Plain
 * factory function (like `equipment-fixtures.ts`), so tests override fields
 * via object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

export const E2E_MAINTENANCE_SCHEDULE_ID = 'e2e-maintenance-1';

export interface MaintenanceScheduleOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organization: string;
  readonly equipment: string;
  readonly equipmentType: string;
  readonly dueStatus: 'unscheduled' | 'up_to_date' | 'due_soon' | 'overdue';
  readonly nextDueAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** An overdue fire-extinguisher schedule with no inspection ever recorded. */
export function maintenanceScheduleOutput(
  overrides: Partial<MaintenanceScheduleOutputFixture> = {},
): MaintenanceScheduleOutputFixture {
  return {
    '@id': `/api/maintenance/schedules/${E2E_MAINTENANCE_SCHEDULE_ID}`,
    '@type': 'MaintenanceSchedule',
    id: E2E_MAINTENANCE_SCHEDULE_ID,
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    equipment: '/api/equipment/e2e-equipment-1',
    equipmentType: 'fire_extinguisher',
    dueStatus: 'overdue',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-08-01T00:00:00+00:00',
    ...overrides,
  };
}
