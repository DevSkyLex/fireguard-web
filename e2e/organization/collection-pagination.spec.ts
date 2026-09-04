import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const mode of [
  { width: 1562, dark: true },
  { width: 320, dark: false },
  { width: 375, dark: true },
  { width: 768, dark: false },
]) {
  test(
    'navigates numbered collection pages without overflow at ' + mode.width + 'px',
    async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width: mode.width, height: 938 });
      if (mode.dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      const intervention = interventionOutput();
      await api.mockAuthenticatedSession();
      await api.mockInterventionList(E2E_ORGANIZATION_ID, [intervention]);
      await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
      await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
      await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
      await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
      await api.mockInterventionWorkItems(intervention.id, []);
      await api.mockInterventionChanges(intervention.id, []);
      await api.mockInterventionIssues(intervention.id, []);
      await page.route(/\/api\/interventions(\?.*)?$/, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/ld+json',
          body: JSON.stringify(hydraCollection([intervention], { totalItems: 600 })),
        }),
      );
      await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/interventions');
      const pagination = page.getByRole('navigation', { name: 'Pagination', exact: true });
      await expect(page.getByTestId('interventions-page-number-1')).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(pagination.locator('[data-testid*="-page-number-"]:visible')).toHaveCount(
        mode.width < 640 ? 3 : 5,
      );

      const pageResponse = page.waitForResponse(
        (response) =>
          /\/api\/interventions\?/.test(response.url()) &&
          new URL(response.url()).searchParams.get('page') === '2',
      );
      await page.getByTestId('interventions-page-number-2').click();
      await pageResponse;
      await expect(page.getByTestId('interventions-page-number-2')).toHaveAttribute(
        'aria-current',
        'page',
      );
      await page.getByTestId('interventions-page-number-3').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('interventions-page-number-3')).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expectNoHorizontalOverflow(page);
      const bounds = await pagination.boundingBox();
      if (!bounds) throw new Error('Pagination must have visible bounds.');
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(mode.width);
      if (mode.width < 640) {
        const button = await page.getByTestId('interventions-page-number-3').boundingBox();
        if (!button) throw new Error('The current page button must have visible bounds.');
        expect(button.height).toBeGreaterThanOrEqual(44);
        expect(button.width).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({
        path: 'e2e/artifacts/collection-pagination-' + mode.width + '.png',
        fullPage: true,
        animations: 'disabled',
      });
    },
  );
}
