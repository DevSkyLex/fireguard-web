import type { ServiceRequestOutput } from '../service-request-output.interface';
/**
 * Function serviceRequestFixture
 *
 * @description
 * Typed baseline transport projection for focused request workflow regression tests.
 *
 * @access public
 * @since unreleased
 *
 * @param {Partial<ServiceRequestOutput>} overrides - Transport fields specific to the regression
 *   scenario.
 *
 * @returns {ServiceRequestOutput} Result owned by the request workflow.
 */
export function serviceRequestFixture(
  overrides: Partial<ServiceRequestOutput> = {},
): ServiceRequestOutput {
  return {
    '@id': '/api/organizations/org/service-requests/request',
    '@type': 'ServiceRequest',
    id: 'request',
    organizationId: 'org',
    equipmentId: 'equipment',
    siteId: 'site',
    title: 'Repair damaged gauge',
    description: 'The pressure gauge is damaged.',
    priority: 'normal',
    status: 'requested',
    originInspectionId: null,
    originNonConformityId: null,
    targetSnapshot: {
      equipment: {
        id: 'equipment',
        name: 'Extinguisher A',
        assetCode: 'FIRE-1',
        status: 'operational',
      },
      site: { id: 'site', name: 'Hospital' },
      customer: { id: 'customer', name: 'Hospital operator' },
    },
    qualificationNote: null,
    decisionReason: null,
    interventionId: null,
    taskId: null,
    requestedAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
    qualifiedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    convertedAt: null,
    revision: 1,
    ...overrides,
  };
}
