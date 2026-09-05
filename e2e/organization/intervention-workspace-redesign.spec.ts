import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_MEMBER_IRI,
  interventionIssueOutput,
  interventionOutput,
  interventionWorkItemOutput,
} from '../support/fixtures/intervention-fixtures';
import { organizationMemberOutput } from '../support/fixtures/member-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const width of [390, 768, 1440]) {
  for (const dark of [false, true]) {
    test(`keeps the work, recording state and command accessible at ${width}px in ${dark ? 'dark' : 'light'} mode`, async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 940 });
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const errors = collectConsoleErrors(page);
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      const intervention = interventionOutput({
        name: 'Annual safety inspection — Riverside logistics centre',
        description:
          'Inspect the loading bays and emergency exits. Record evidence for each inspected resource before submitting the intervention.',
        status: 'in_progress',
        responsible: E2E_MEMBER_IRI,
        allowedTransitions: ['submitted', 'abandoned'],
        priority: 'urgent',
        workItemsCount: 7,
        completedWorkItemsCount: 2,
        blockersCount: 1,
      });
      await api.mockInterventionDetail(intervention);
      await api.mockInterventionWorkItems(
        intervention.id,
        Array.from({ length: 7 }, (_, index) =>
          interventionWorkItemOutput({
            id: `redesign-work-${index}`,
            '@id': `/api/intervention-work-items/redesign-work-${index}`,
            action: 'inspection',
            target: `Loading bay ${index + 1} — fire protection equipment and emergency access`,
            status: index < 2 ? 'completed' : index === 2 ? 'skipped' : 'planned',
            skipReason: index === 2 ? 'Access unavailable during unloading.' : null,
          }),
        ),
      );
      await api.mockInterventionChanges(intervention.id, []);
      await api.mockInterventionIssues(intervention.id, [
        interventionIssueOutput({ message: 'Complete the required work before publication.' }),
      ]);
      await api.mockInterventionActivities(intervention.id, []);
      await api.mockInterventionAttachments(intervention.id, []);
      await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
      await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
      await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
      await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}`);
      const command = page.getByTestId('intervention-detail-command');
      await expect(command).toBeInViewport();
      await expect(page.getByTestId('intervention-recording-state')).toHaveCount(0);
      await expect(page.getByTestId('intervention-property-status')).toContainText('In progress');
      const rows = page
        .locator(
          '[data-testid="intervention-work-item-table-row"], [data-testid="intervention-work-item-table-card"]',
        )
        .filter({ visible: true });
      await expect(rows).toHaveCount(4);
      await expect(rows.first()).toBeInViewport({ ratio: 0.5 });
      await expect(page.getByTestId('intervention-activity-thread')).toBeVisible();
      expect(
        await page
          .getByTestId('intervention-work-items-progress')
          .evaluate((element) => getComputedStyle(element).borderBottomWidth),
      ).toBe('0px');
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`workspace-${width}-${dark ? 'dark' : 'light'}.png`),
        animations: 'disabled',
      });
      await page.getByTestId('intervention-work-items-filter').click();
      await page.getByRole('option', { name: /^All 7$/ }).click();
      await expect(rows).toHaveCount(7);
      await rows.last().scrollIntoViewIfNeeded();
      const last = await rows.last().boundingBox();
      const band = await page.getByTestId('intervention-detail-status-band').boundingBox();
      expect(last).not.toBeNull();
      expect(band).not.toBeNull();
      if (!last || !band) throw new Error('The work row and command band must be laid out.');
      expect(last.y).toBeGreaterThanOrEqual(band.y + band.height);
      await expect(command).toBeInViewport();
      await page.getByTestId('intervention-detail-menu').click();
      await page.getByTestId('intervention-detail-discussion-trigger').click();
      await expect(page.getByTestId('intervention-comment-body')).toBeFocused();
      await page.getByRole('tab', { name: 'Work', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'Changes 0', exact: true })).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
}
