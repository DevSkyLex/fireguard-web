import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import {
  arrangePaginatedWorkItems,
  expectReadableWorkItemEffort,
} from '../support/helpers/intervention-detail-tables';

for (const dark of [false, true]) {
  test(`paginates work items on the server without overlapping badges or actions — ${dark ? 'dark' : 'light'}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1592, height: 938 });
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const path = await arrangePaginatedWorkItems(page);
    const requests: URL[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/intervention-work-items?'))
        requests.push(new URL(request.url()));
    });
    await page.goto(path);
    const rows = page.getByTestId('intervention-work-item-table-row');
    await expect(rows).toHaveCount(10);
    await expectReadableWorkItemEffort(rows);
    const title = rows.first().getByTestId('intervention-work-item-title');
    await title.focus();
    await expect(page.getByRole('tooltip')).toHaveText(await title.innerText());
    await title.press('Tab');
    const effortTrigger = rows.nth(3).getByTestId('intervention-work-item-effort').locator('..');
    await effortTrigger.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip.locator('dt')).toHaveText(['Estimated', 'Spent', 'Remaining']);
    await expect(tooltip.locator('dd')).toHaveText(['4 h', '2 h', '3 h']);
    await effortTrigger.press('Tab');
    await expect(page.getByTestId('intervention-work-items-progress')).toContainText('12/32');
    await expect(page.getByTestId('intervention-work-items-row-count')).toContainText('10 of 20');
    await expect(page.getByRole('columnheader', { name: 'Requirement', exact: true })).toHaveCount(
      0,
    );
    await expect(rows.nth(1)).toContainText('Optional');
    await expect(rows.nth(3).getByTestId('intervention-work-item-state')).not.toContainText(
      'Planned',
    );
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(
      page.locator('app-intervention-work-item-table [data-slot="table-container"]'),
    );
    const collisions = await rows.evaluateAll((elements) =>
      elements.flatMap((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.flatMap((cell, index) => {
          if (index < 4) return [];
          const bounds = cell.getBoundingClientRect();
          return Array.from(cell.querySelectorAll('[data-slot="badge"], button'))
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return (
                rect.width > 0 && (rect.right > bounds.right + 1 || rect.left < bounds.left - 1)
              );
            })
            .map((element) => element.textContent ?? 'overflow');
        });
      }),
    );
    expect(collisions).toEqual([]);
    const directory = join(
      'e2e/artifacts/work-item-pagination',
      process.env['FG_WORK_ITEMS_RUN'] ?? 'inspection',
      dark ? 'dark' : 'light',
    );
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: join(directory, 'desktop.png'), animations: 'disabled' });
    const next = page.getByTestId('intervention-work-items-page-next');
    await next.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(directory, 'desktop-pagination.png'),
      animations: 'disabled',
    });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(rows.first()).toContainText('Task 10');
    await expect(rows).toHaveCount(10);
    expect(
      requests.some(
        (url) =>
          url.searchParams.get('page') === '2' &&
          url.searchParams.get('itemsPerPage') === '10' &&
          url.searchParams.getAll('status[]').length === 2,
      ),
    ).toBe(true);
    await expect(page.getByTestId('intervention-work-items-progress')).toContainText('12/32');
    await page.getByTestId('intervention-work-items-mine-first').click();
    await expect(page.getByTestId('intervention-work-items-page-indicator')).toContainText(
      'Page 1',
    );
    await expect(rows.first()).toContainText('Task 10');
    expect(requests.some((url) => url.searchParams.has('prioritizeAssignee'))).toBe(true);
    await page.getByTestId('intervention-work-items-search').fill('Task 19');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Task 19');
    await expect(page.getByTestId('intervention-work-items-row-count')).toContainText('1 of 1');
  });
}
