import { type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { equipmentOutput } from '../fixtures/equipment-fixtures';
import { facilityOutput } from '../fixtures/facility-fixtures';
import { inspectionOutput } from '../fixtures/inspection-fixtures';
import { interventionOutput, interventionWorkItemOutput } from '../fixtures/intervention-fixtures';
import { ApiMock } from '../mocks/api-mock';

/** Registers isolated read fixtures for the intervention table regression matrix. */
export async function arrangeInterventionTables(
  page: Page,
  actions = true,
  configure?: (api: ApiMock) => Promise<void>,
): Promise<string> {
  const api = new ApiMock(page);
  const base = interventionOutput();
  const intervention = interventionOutput({
    name: 'Table regression intervention',
    status: 'in_progress',
    description: 'Details '.repeat(80),
    workItemsCount: 1,
    proposedChangesCount: 1,
    facilitiesCount: 1,
    equipmentCount: 1,
    inspectionsCount: 1,
    allowedActions: { ...base.allowedActions, canMutateChanges: actions },
  });
  await api.mockAuthenticatedSession();
  if (!actions)
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: [
        'organization.interventions.read',
        'organization.equipment.read',
        'organization.facilities.read',
        'organization.inspections.read',
      ],
    });
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(intervention.id, [
    interventionWorkItemOutput({ target: 'Emergency pump' }),
  ]);
  await api.mockInterventionChanges(intervention.id, [
    {
      '@id': '/api/intervention-changes/table-change',
      '@type': 'InterventionChange',
      id: 'table-change',
      intervention: intervention['@id'],
      workItem: null,
      resource: '/api/equipment/table-equipment',
      status: 'proposed',
      revision: 1,
      patch: {
        locationLabel: 'A particularly long equipment location, '.repeat(12),
        status: 'decommissioned',
      },
      createdAt: intervention.createdAt,
      updatedAt: intervention.updatedAt,
    },
  ]);
  await api.mockInterventionIssues(intervention.id, []);
  await api.mockInterventionActivities(intervention.id, []);
  await api.mockInterventionAttachments(intervention.id, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionFacilities(intervention.id, [facilityOutput()]);
  await api.mockInterventionEquipment(intervention.id, [equipmentOutput()]);
  await api.mockInterventionInspections(intervention.id, [inspectionOutput()]);
  await configure?.(api);
  return `/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}`;
}
