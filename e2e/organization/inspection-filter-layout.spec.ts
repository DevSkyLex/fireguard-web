import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { inspectionOutput } from '../support/fixtures/inspection-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InspectionsPage } from '../support/pages/inspections.page';

for (const mode of [
  { width: 1562, dark: true },
  { width: 1562, dark: false },
  { width: 375, dark: true },
  { width: 320, dark: false },
]) {
  test(
    'centers shared filter operators and groups inspection actions at ' +
      mode.width +
      'px ' +
      mode.dark,
    async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width: mode.width, height: 938 });
      if (mode.dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockInspectionList(E2E_ORGANIZATION_ID, [inspectionOutput()]);
      const inspections = new InspectionsPage(page);
      await inspections.gotoList(E2E_ORGANIZATION_ID);
      await inspections.openFilters();
      await inspections.addFilter('Result');
      await page.getByRole('option', { name: 'Pass', exact: true }).click();
      await expect(page.getByRole('option', { name: 'Pass', exact: true })).toBeHidden();
      const operator = page.getByTestId('inspections-filter-chip-operator');
      await expect(operator).toHaveText('is');
      const centers = await operator.evaluate((element) => {
        const text = document.createRange();
        text.selectNodeContents(element);
        const textBox = text.getBoundingClientRect();
        const row = element.closest('app-filter-chip')?.querySelector('button');
        if (!row) throw new Error('Expected a value trigger in the shared filter chip.');
        const rowBox = row.getBoundingClientRect();
        return {
          text: textBox.y + textBox.height / 2,
          row: rowBox.y + rowBox.height / 2,
        };
      });
      expect(Math.abs(centers.text - centers.row)).toBeLessThanOrEqual(2);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: 'e2e/artifacts/inspection-filters-' + mode.width + '-' + mode.dark + '.png',
        fullPage: true,
        animations: 'disabled',
      });

      const actions = page.getByTestId('inspections-actions-menu');
      await actions.focus();
      await page.keyboard.press('Enter');
      const analytics = page.getByRole('menuitem', { name: 'Analytics' });
      await expect(analytics).toBeVisible();
      await expect(analytics).toHaveAttribute(
        'href',
        '/organizations/' + E2E_ORGANIZATION_ID + '/inspections/analytics',
      );
      await page.keyboard.press('Escape');
      await expect(actions).toBeFocused();
      await inspections.newLink.click();
      await expect(inspections.createRoot).toBeVisible();
    },
  );
}
