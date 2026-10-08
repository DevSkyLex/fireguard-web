import type { MaintenanceCostOutput } from '../maintenance-cost-output.interface';

/**
 * Function maintenanceCostFixture
 *
 * @description
 * Private financial fixture keeps exact unknown/current/frozen distinctions.
 *
 * @param {Partial<MaintenanceCostOutput>} overrides - Explicit fixture contract overrides.
 *
 * @returns {MaintenanceCostOutput} Validated financial contract result.
 */
export function maintenanceCostFixture(
  overrides: Partial<MaintenanceCostOutput> = {},
): MaintenanceCostOutput {
  return {
    '@id': '/api/organizations/org/interventions/12345678-1234-4234-8234-123456789abc/costs',
    '@type': 'MaintenanceCost',
    id: '12345678-1234-4234-8234-123456789abc',
    organizationId: 'org',
    interventionId: '12345678-1234-4234-8234-123456789abc',
    currency: 'EUR',
    plannedBudget: null,
    estimatedMinutes: null,
    planningRevision: 0,
    planningEditable: true,
    resources: [],
    current: { total: null, knownTotal: '0.000000', complete: false, items: [] },
    frozen: null,
    ...overrides,
  };
}
