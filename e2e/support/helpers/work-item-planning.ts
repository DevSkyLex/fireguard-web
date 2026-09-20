import { expect, type Page } from '@playwright/test';
import { interventionOutput, interventionWorkItemOutput } from '../fixtures/intervention-fixtures';
import { arrangeInterventionTables } from './intervention-detail-tables';

/**
 * Function arrangeWorkItemPlanning
 *
 * @description
 * Provides a bounded period in the current month and records isolated idempotent creation requests.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Page} page - Hermetic browser page.
 * @returns {Promise<{ writes: Record<string, unknown>[]; date: (day: number) => string }>} Request evidence and local date expectations.
 */
export async function arrangeWorkItemPlanning(page: Page): Promise<{
  writes: Record<string, unknown>[];
  date: (day: number) => string;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  await page.clock.setFixedTime(new Date(year, month, 15, 12));
  const path = await arrangeInterventionTables(page, true, async (api) => {
    await api.mockInterventionDetail(
      interventionOutput({
        status: 'in_progress',
        name: 'Annual inspection — regional fire safety equipment and emergency signage',
        plannedStartAt: new Date(year, month, 1, 12).toISOString(),
        dueAt: new Date(year, month, 28, 12).toISOString(),
        workItemsCount: 1,
      }),
    );
  });
  const writes: Record<string, unknown>[] = [];
  await page.route(/\/api\/intervention-work-items\/[^/?]+$/, async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    expect(route.request().headers()['if-none-match']).toBe('*');
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const id = new URL(route.request().url()).pathname.split('/').at(-1);
    writes.push(body);
    await route.fulfill({
      status: 201,
      json: {
        ...interventionWorkItemOutput(),
        ...body,
        id,
        '@id': `/api/intervention-work-items/${id}`,
      },
    });
  });
  await page.goto(path);
  await page.getByTestId('intervention-work-items-add').click();
  await expect(page.getByTestId('intervention-work-item-sheet')).toBeVisible();
  return {
    writes,
    date: (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}
