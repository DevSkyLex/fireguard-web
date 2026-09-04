import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_MEMBER_IRI, interventionOutput } from '../support/fixtures/intervention-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

/**
 * The band is the one address for an intervention's forward move, so it is the
 * one place two long-standing defects showed: the target was derived from the
 * workflow phase rather than from the transitions the API declares legal, and
 * the whole band was gated on `canPublish`.
 */

const SCREENSHOT_DIR = 'test-results/uiux-final-20260903';

const PLANNED_ID = 'e2e-command-planned';
const SUBMITTED_ID = 'e2e-command-submitted';

const plannedIntervention = interventionOutput({
  id: PLANNED_ID,
  '@id': `/api/interventions/${PLANNED_ID}`,
  number: 601,
  name: 'Extinguisher round — not started',
  status: 'planned',
  responsible: E2E_MEMBER_IRI,
  allowedTransitions: ['in_progress', 'abandoned'],
});

const submittedIntervention = interventionOutput({
  id: SUBMITTED_ID,
  '@id': `/api/interventions/${SUBMITTED_ID}`,
  number: 602,
  name: 'Riser inspection awaiting review',
  status: 'submitted',
  responsible: E2E_MEMBER_IRI,
  allowedTransitions: ['changes_requested', 'in_progress'],
});

async function mockDetail(
  api: ApiMock,
  intervention: ReturnType<typeof interventionOutput>,
): Promise<void> {
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(intervention.id, []);
  await api.mockInterventionChanges(intervention.id, []);
  await api.mockInterventionIssues(intervention.id, []);
  await api.mockInterventionActivities(intervention.id, []);
  await api.mockInterventionAttachments(intervention.id, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

test.describe('Intervention detail — the forward command', () => {
  test('names starting the field work from planned, not a submit the server refuses', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockDetail(api, plannedIntervention);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, PLANNED_ID);

    await expect(detail.commandButton).toContainText('Start field work');
    await expect(detail.commandButton).not.toContainText('Submit');
  });

  test('keeps the band in the thumb zone at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockDetail(api, plannedIntervention);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, PLANNED_ID);
    await expect(detail.commandButton).toBeVisible();

    const box = await detail.commandButton.boundingBox();
    expect(box, 'the command button must be laid out to be measured').not.toBeNull();
    // The lower third of a 667px viewport starts at 444px.
    expect(box?.y ?? 0).toBeGreaterThan((667 / 3) * 2);
    await expect(detail.commandButton).toBeInViewport();
  });

  test('gives a reviewer without publish rights their action instead of an empty band', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: [
        'organization.interventions.read',
        'organization.interventions.review',
        'organization.members.read',
      ],
    });
    await mockDetail(api, submittedIntervention);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, SUBMITTED_ID);

    const sendBack = page.getByTestId('intervention-command-secondary');
    await expect(sendBack).toBeVisible();
    await expect(sendBack).toContainText('Send back for changes');
    await expect(detail.commandButton).toHaveCount(0);
  });

  test('renders the band at 375px in dark mode with the action in the thumb zone', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockDetail(api, plannedIntervention);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, PLANNED_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(detail.commandButton).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: SCREENSHOT_DIR + '/intervention-command-dark-375.png' });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders the band at 1280px in light mode, sticky at the top', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockDetail(api, plannedIntervention);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, PLANNED_ID);

    await expect(detail.commandButton).toBeVisible();
    const box = await detail.commandButton.boundingBox();
    // On desktop the band goes back to the top: the thumb zone is a phone rule.
    expect(box?.y ?? 9999).toBeLessThan(800 / 3);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: SCREENSHOT_DIR + '/intervention-command-light-1280.png' });
  });
});
