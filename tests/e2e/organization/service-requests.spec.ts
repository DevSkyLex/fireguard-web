import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { setDarkTheme } from '../support/helpers/appearance';
import {
  captureServiceRequest,
  installServiceRequests,
  SERVICE_REQUEST_EQUIPMENT_ID,
  SERVICE_REQUEST_EQUIPMENT_LABEL,
  SERVICE_REQUEST_ID,
  SERVICE_REQUEST_INTERVENTION_ID,
  SERVICE_REQUEST_SITE_ID,
  SERVICE_REQUEST_SITE_NAME,
  SERVICE_REQUEST_TASK_ID,
  SERVICE_REQUEST_WORK_NAME,
} from '../support/helpers/service-requests';
import { ServiceRequestsPage } from '../support/pages/service-requests.page';

test.describe('Maintenance request qualification and work conversion', () => {
  test('creates a site request, identifies its equipment and retries the exact conversion after its committed response is lost', async ({
    page,
  }, info) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const state = await installServiceRequests(page, { loseConversionResponse: true });
    const requests = new ServiceRequestsPage(page);
    await requests.goto(E2E_ORGANIZATION_ID);
    await requests.prepareSiteRequest(
      SERVICE_REQUEST_SITE_NAME,
      'Repair the entrance extinguisher',
      'The site control reports a damaged pressure gauge at the main entrance.',
    );
    await captureServiceRequest(page, info, 'site-request-description-light');
    await requests.submitRequest();
    await expect(requests.editor).toBeHidden();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/service-requests/${SERVICE_REQUEST_ID}$`),
    );
    expect(state.created).toHaveLength(1);
    expect(state.created[0]).toMatchObject({
      siteId: SERVICE_REQUEST_SITE_ID,
      title: 'Repair the entrance extinguisher',
      priority: 'normal',
    });
    expect(state.created[0].equipmentId ?? null).toBeNull();
    expect(state.committedLinks).toBe(0);
    await requests.prepareSiteQualification(
      SERVICE_REQUEST_EQUIPMENT_LABEL,
      'Identify FIRE-12 and repair its damaged pressure gauge.',
    );
    await captureServiceRequest(page, info, 'site-request-qualification-light');
    await requests.confirmQualification();
    await expect(requests.editor).toBeHidden();
    await expect(requests.convert).toBeVisible();
    expect(state.qualifications).toEqual([
      {
        body: {
          equipmentId: SERVICE_REQUEST_EQUIPMENT_ID,
          note: 'Identify FIRE-12 and repair its damaged pressure gauge.',
        },
        ifMatch: '"revision-1"',
      },
    ]);
    expect(state.siteEquipmentQueries.length).toBeGreaterThan(0);
    expect(state.requests.get(SERVICE_REQUEST_ID)?.revision).toBe(3);
    expect(state.requests.get(SERVICE_REQUEST_ID)?.targetSnapshot.customer).toEqual({
      id: '710e8400-e29b-41d4-a716-446655710006',
      name: 'North site operator',
    });
    await requests.prepareConversion();
    await requests.confirmConversion();
    await expect(requests.retryConversion).toBeVisible();
    await expect(
      requests.actions.getByRole('button', { name: 'Create corrective intervention', exact: true }),
    ).toBeDisabled();
    expect(state.conversions).toHaveLength(1);
    expect(state.conversions[0].ifMatch).toBe('"revision-3"');
    expect(state.committedLinks).toBe(1);
    expect(state.newWorkCreated).toBe(1);
    expect(state.targetRetired).toBe(true);
    const readsAfterCommit = state.targetReads.length;
    await captureServiceRequest(page, info, 'committed-conversion-response-lost-light');
    await requests.retryConversion.click();
    await expect(requests.editor).toBeHidden();
    await expect(requests.correctiveLink).toBeVisible();
    expect(state.conversions).toHaveLength(2);
    expect(state.conversions[1]).toEqual(state.conversions[0]);
    expect(state.targetReads).toHaveLength(readsAfterCommit);
    expect(state.committedLinks).toBe(1);
    expect(state.newWorkCreated).toBe(1);
    await expect(requests.correctiveLink).toHaveAttribute(
      'href',
      `/organizations/${E2E_ORGANIZATION_ID}/interventions/${SERVICE_REQUEST_INTERVENTION_ID}?targetEquipment=${SERVICE_REQUEST_EQUIPMENT_ID}&workAction=repair`,
    );
    await expect(requests.detail.getByTestId('service-request-work-link')).toHaveCount(1);
    await captureServiceRequest(page, info, 'converted-request-dossier-light');
    expect(pageErrors).toEqual([]);
  });

  test('links a real pending repair task from the equipment open-work projection without creating duplicate work', async ({
    page,
    context,
    baseURL,
  }, info) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const state = await installServiceRequests(page, { qualified: true, existingWork: true });
    const requests = new ServiceRequestsPage(page);
    await requests.goto(E2E_ORGANIZATION_ID, SERVICE_REQUEST_ID);
    await expect(requests.convert).toBeVisible();
    await requests.prepareConversion(SERVICE_REQUEST_WORK_NAME);
    await expect(
      requests.actions.getByRole('button', { name: 'Link this corrective work', exact: true }),
    ).toBeEnabled();
    await captureServiceRequest(page, info, 'existing-repair-selection-dark');
    await requests.confirmConversion(true);
    await expect(requests.editor).toBeHidden();
    await expect(requests.correctiveLink).toBeVisible();
    expect(state.conversions).toHaveLength(1);
    expect(state.conversions[0].ifMatch).toBe('"revision-2"');
    expect(state.conversions[0].body).toEqual({
      clientOperationId: state.conversions[0].body.clientOperationId,
      existingInterventionId: state.work[0].interventionId,
      existingTaskId: state.work[0].workItemId,
    });
    expect(state.requests.get(SERVICE_REQUEST_ID)?.taskId).toBe(SERVICE_REQUEST_TASK_ID);
    expect(state.newWorkCreated).toBe(0);
    expect(state.committedLinks).toBe(1);
    await expect(requests.detail.getByTestId('service-request-work-link')).toHaveCount(1);
    await expect(requests.correctiveLink).toHaveAttribute(
      'href',
      `/organizations/${E2E_ORGANIZATION_ID}/interventions/${state.work[0].interventionId}?targetEquipment=${SERVICE_REQUEST_EQUIPMENT_ID}&workAction=repair`,
    );
    await captureServiceRequest(page, info, 'existing-repair-linked-dossier-dark');
  });
});
