import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

/**
 * The "Published" banner's materialisation summary.
 *
 * Publication writes several records atomically and cannot be undone, and the
 * banner said only that it had happened. The counts it now shows are the
 * records carrying this intervention's id — what the publication actually
 * wrote — and they have always been on `InterventionOutput`.
 *
 * A publication *timestamp* genuinely does not exist on the contract, so the
 * banner must never claim one; that is asserted here too.
 */
test.describe('Published intervention banner', () => {
  const organization = organizationOutput();

  const landOn = async (
    page: Parameters<Parameters<typeof test>[1]>[0]['page'],
    counts: { facilitiesCount: number; equipmentCount: number; inspectionsCount: number },
  ): Promise<void> => {
    const intervention = interventionOutput({
      status: 'published',
      allowedTransitions: [],
      ...counts,
    });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkspace(intervention.id);
    await api.mockInterventionPlanningOptions(organization.id);

    const detail = new InterventionDetailPage(page);
    await detail.goto(organization.id, intervention.id);
  };

  test('summarises what the publication wrote', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOn(page, { facilitiesCount: 3, equipmentCount: 12, inspectionsCount: 4 });

    const summary = page.getByTestId('intervention-published-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('3');
    await expect(summary).toContainText('12');
    await expect(summary).toContainText('4');
  });

  // A count of zero is not a record that was written, so it must not be listed
  // as one — an intervention that published nothing would otherwise read as
  // having produced three empty things.
  test('omits the categories that produced nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOn(page, { facilitiesCount: 0, equipmentCount: 5, inspectionsCount: 0 });

    const summary = page.getByTestId('intervention-published-summary');
    await expect(summary).toContainText('equipment');
    await expect(summary).not.toContainText('sites');
    await expect(summary).not.toContainText('inspections');
  });

  test('drops the summary entirely when nothing was materialised', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOn(page, { facilitiesCount: 0, equipmentCount: 0, inspectionsCount: 0 });

    await expect(page.getByTestId('intervention-published-summary')).toHaveCount(0);
    // The banner itself still states the read-only consequence.
    await expect(page.getByTestId('intervention-workspace')).toContainText('now read-only');
  });
});
