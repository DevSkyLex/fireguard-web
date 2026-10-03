import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  interventionIssueOutput,
  interventionOutput,
} from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

const interventionId = 'e2e-facility-tab-1';
const createdFacilityId = 'e2e-facility-tab-created-1';
const parentSite = facilityOutput({
  id: 'e2e-facility-tab-parent-site',
  '@id': '/api/facilities/e2e-facility-tab-parent-site',
  type: 'site',
  name: 'North Site',
  parentFacilityId: null,
  recordStatus: 'published',
});

const intervention = interventionOutput({
  id: interventionId,
  '@id': `/api/interventions/${interventionId}`,
  number: 501,
  name: 'New site setup',
  status: 'planned',
  facilitiesCount: 0,
});

const facilityBlocker = interventionIssueOutput({
  resource: `/api/interventions/${interventionId}`,
  field: null,
  message: 'At least one facility is required.',
});

const createdFacility = facilityOutput({
  id: createdFacilityId,
  '@id': `/api/facilities/${createdFacilityId}`,
  type: 'building',
  name: 'North Building',
  parentFacilityId: parentSite.id,
  recordStatus: 'draft',
});

/** Registers the session and every read the detail route's workspace + planning-options bursts fire on load. */
async function mockDetailPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(interventionId, []);
  await api.mockInterventionChanges(interventionId, []);
  await api.mockInterventionIssues(interventionId, [facilityBlocker]);
  await api.mockInterventionActivities(interventionId, []);
  await api.mockInterventionAttachments(interventionId, []);
  await api.mockInterventionFacilityList([]);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

test.describe('Intervention detail — Facilities tab', () => {
  test('shows the empty list, the publication blocker and the Add facility CTA', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);
    const detail = new InterventionDetailPage(page);

    await detail.goto(E2E_ORGANIZATION_ID, interventionId);

    await expect(detail.issuesChecklist).toBeVisible();
    await expect(detail.issuesChecklist).toContainText('At least one facility is required.');

    await detail.openFacilitiesTab();

    await expect(detail.addFacilityButton).toBeVisible();
    await expect(page.getByTestId('intervention-facilities-empty')).toBeVisible();
    await expect(detail.facilityRows).toHaveCount(0);
  });

  test('creates a facility from the sheet, clearing the blocker once it lands', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [parentSite]);
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, parentSite);
    await api.mockInterventionFacilityCreate(createdFacility);
    const detail = new InterventionDetailPage(page);

    await detail.goto(E2E_ORGANIZATION_ID, interventionId);
    await detail.openFacilitiesTab();

    const createRequest = page.waitForRequest(
      (request) => request.url().endsWith('/api/facilities') && request.method() === 'POST',
    );

    await detail.createFacility('Building', 'North Building', parentSite.name);

    const request = await createRequest;
    const payload = request.postDataJSON() as {
      readonly type: string;
      readonly name: string;
      readonly parentFacilityId: string;
      readonly organization: string;
      readonly intervention: string;
    };
    expect(payload.type).toBe('building');
    expect(payload.name).toBe('North Building');
    expect(payload.parentFacilityId).toBe(parentSite.id);
    expect(payload.organization).toBe(`/api/organizations/${E2E_ORGANIZATION_ID}`);
    expect(payload.intervention).toBe(`/api/interventions/${interventionId}`);

    await api.mockInterventionDetail({
      ...intervention,
      facilitiesCount: 1,
      blockersCount: 0,
    });
    await api.mockInterventionFacilityList([createdFacility]);
    await api.mockInterventionIssues(interventionId, []);

    await expect(detail.facilitySheet).toBeHidden();
    await expect(detail.facilityRows).toHaveCount(1);
    await expect(detail.facilityRows).toContainText('North Building');
    await expect(detail.facilityDraftBadge).toBeVisible();
    await expect(detail.issuesChecklist).toHaveCount(0);
  });

  test('hides the Add facility CTA once the intervention is no longer mutable', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    const publishedIntervention = interventionOutput({
      id: interventionId,
      '@id': `/api/interventions/${interventionId}`,
      number: 502,
      name: 'Published site setup',
      status: 'published',
      allowedTransitions: [],
      allowedActions: {
        canEditDetails: false,
        canEditSite: false,
        canEditResponsible: false,
        canEditPlanning: false,
        canMutateWorkItems: false,
        canMutateChanges: false,
        canAssignTeam: false,
        canManageAttachments: false,
        canSubmit: false,
        canWithdraw: false,
        canDelete: false,
        canPublish: false,
      },
      facilitiesCount: 1,
    });
    await api.mockAuthenticatedSession();
    await api.mockInterventionDetail(publishedIntervention);
    await api.mockInterventionWorkItems(interventionId, []);
    await api.mockInterventionChanges(interventionId, []);
    await api.mockInterventionIssues(interventionId, []);
    await api.mockInterventionActivities(interventionId, []);
    await api.mockInterventionAttachments(interventionId, []);
    await api.mockInterventionFacilityList([facilityOutput({ recordStatus: 'published' })]);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    const detail = new InterventionDetailPage(page);

    await detail.goto(E2E_ORGANIZATION_ID, interventionId);
    await detail.openFacilitiesTab();

    await expect(detail.facilityRows).toHaveCount(1);
    await expect(detail.addFacilityButton).toHaveCount(0);
  });
});
