import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  arrangePaginatedWorkItems,
  expectReadableWorkItemEffort,
} from '../support/helpers/intervention-detail-tables';

for (const dark of [false, true]) {
  test(`paginates tactile work-item cards with long labels — ${dark ? 'dark' : 'light'}`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await emulateMobilePlatform(
      context,
      testInfo.project.name === 'Mobile Safari' ? 'ios' : 'android',
    );
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.goto(await arrangePaginatedWorkItems(page));
    const cards = page.getByTestId('intervention-work-item-table-card');
    await expect(cards).toHaveCount(10);
    await expect(cards.first()).toBeVisible();
    await expectReadableWorkItemEffort(cards);
    await expectNoHorizontalOverflow(page);
    const directory = join(
      'e2e/artifacts/work-item-pagination',
      process.env['FG_WORK_ITEMS_RUN'] ?? 'inspection',
      testInfo.project.name,
      dark ? 'dark' : 'light',
    );
    await mkdir(directory, { recursive: true });
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, 'mobile.png'), animations: 'disabled' });
    await cards.nth(3).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, 'mobile-effort.png'), animations: 'disabled' });
    const next = page.getByTestId('intervention-work-items-page-next');
    await next.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(directory, 'mobile-pagination.png'),
      animations: 'disabled',
    });
    await next.tap();
    await expect(cards.first()).toContainText('Task 10');
    await expect(cards).toHaveCount(10);
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId('intervention-work-items-progress')).toContainText('12/32');
  });
}
