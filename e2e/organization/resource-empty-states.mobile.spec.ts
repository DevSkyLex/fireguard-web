import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { collectConsoleErrors } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  expectResourceIllustration,
  mockEmptyResources,
} from '../support/helpers/resource-empty-states';
import { EquipmentsPage } from '../support/pages/equipments.page';

test.describe('Illustrated resource empty states on mobile', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`keeps the ${theme} equipment empty state readable and inside the phone viewport`, async ({
      page,
      context,
      baseURL,
      browserName,
    }) => {
      await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
      await context.addCookies([
        { name: 'theme-preference', value: theme, url: baseURL ?? 'http://localhost:4273' },
      ]);
      const errors = collectConsoleErrors(page);
      await mockEmptyResources(page);
      await new EquipmentsPage(page).gotoList(E2E_ORGANIZATION_ID);
      await expectResourceIllustration(page, 'equipment', theme);
      await expect(page.getByText('No equipment found', { exact: true })).toBeInViewport();
      await page.screenshot({
        path: `e2e/artifacts/resource-empty-states/equipment-mobile-${theme}-${browserName}.png`,
        animations: 'disabled',
      });
      expect(errors).toEqual([]);
    });
  }
});
