import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const width of [1562, 375]) {
  test(
    'keeps attachment tabs free of vertical overflow at ' + width + 'px',
    async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width, height: 938 });
      await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      const intervention = interventionOutput();
      await api.mockAuthenticatedSession();
      await api.mockInterventionDetail(intervention);
      await api.mockInterventionWorkItems(intervention.id, []);
      await api.mockInterventionChanges(intervention.id, []);
      await api.mockInterventionIssues(intervention.id, []);
      await api.mockInterventionActivities(intervention.id, []);
      await api.mockInterventionAttachments(intervention.id, [
        {
          id: 'e2e-attachment-layout',
          fileName: 'q1-campaign-report.pdf',
          mimeType: 'application/pdf',
          size: 943718,
          label: 'Campaign report',
          kind: 'file',
        },
      ]);
      await api.mockInterventionFacilities(intervention.id, []);
      await api.mockInterventionInspections(intervention.id, []);
      await api.mockInterventionEquipment(intervention.id, []);
      await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
      await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
      await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
      await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
      await page.goto(
        '/organizations/' +
          E2E_ORGANIZATION_ID +
          '/interventions/' +
          intervention.id +
          '?tab=attachments',
      );
      await expect(page.getByTestId('intervention-attachment-row')).toBeVisible();

      const downloadAction = page.getByRole('button', {
        name: 'Download q1-campaign-report.pdf',
      });
      const deleteAction = page.getByRole('button', {
        name: 'Delete q1-campaign-report.pdf',
      });
      await expect(downloadAction).toBeVisible();
      await expect(deleteAction).toBeVisible();
      await downloadAction.focus();
      await expect(downloadAction).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(deleteAction).toBeFocused();

      const dimensions = await page.getByTestId('intervention-tabs-list').evaluate((element) => ({
        height: element.clientHeight,
        overflowY: getComputedStyle(element).overflowY,
        scrollHeight: element.scrollHeight,
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(dimensions.overflowY).not.toMatch(/auto|scroll/);
      expect(dimensions.scrollHeight - dimensions.height).toBeLessThanOrEqual(1);
      if (width > 1000) expect(dimensions.scrollWidth).toBe(dimensions.width);
      await expectNoHorizontalOverflow(page);
      const attachmentsTab = page.getByRole('tab', { name: /Attachments/ });
      const inspectionsTab = page.getByRole('tab', { name: /Inspections/ });
      await attachmentsTab.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await expect(inspectionsTab).toBeFocused();
      await expect(inspectionsTab).toBeInViewport();
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await expect(attachmentsTab).toBeFocused();
      await expect(attachmentsTab).toBeInViewport();
      await page.screenshot({
        path: 'e2e/artifacts/intervention-native-attachments-' + width + '.png',
        animations: 'disabled',
        fullPage: true,
      });
    },
  );
}
