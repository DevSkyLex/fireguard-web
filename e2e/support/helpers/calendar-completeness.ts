import { expect, type Page, type TestInfo } from '@playwright/test';
import { ALL_ORGANIZATION_PERMISSIONS, E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow } from './appearance';

/** Exercises partial-source feedback, retry and reduction to a complete one-day window. */
export async function verifyCalendarCompleteness(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: [...ALL_ORGANIZATION_PERMISSIONS, 'organization.events.read'],
  });
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  let requests = 0;
  await page.route(/\/calendar\/feed(\?.*)?$/, async (route) => {
    requests++;
    const params = new URL(route.request().url()).searchParams;
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    const oneDay = Date.parse(to) - Date.parse(from) < 2 * 86_400_000;
    await route.fulfill({
      json: {
        from,
        to,
        items: [],
        complete: oneDay,
        sources: [
          { sourceKey: 'calendar_event', available: true, truncated: false },
          { sourceKey: 'inspection', available: requests > 1, truncated: false },
          { sourceKey: 'maintenance', available: true, truncated: !oneDay },
        ],
      },
    });
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/calendar`);
  const partial = page.getByTestId('calendar-partial');
  await expect(partial).toContainText('Partial results');
  await expect(partial).toContainText('Temporarily unavailable');
  await expect(page.getByText('Nothing scheduled', { exact: false })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  const capture = `e2e/artifacts/reliability/calendar-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${capture}-partial.png`, fullPage: true, animations: 'disabled' });
  await page.getByTestId('calendar-partial-retry').focus();
  await page.keyboard.press('Enter');
  await expect(partial).not.toContainText('Temporarily unavailable');
  await expect(partial).toContainText('More events exist in this period');
  await page.getByTestId('calendar-reduce-period').click();
  await expect(partial).toBeHidden();
  await expect(page.getByTestId('calendar-day-view')).toContainText('Nothing scheduled this day.');
  expect(requests).toBe(3);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${capture}-complete.png`,
    fullPage: true,
    animations: 'disabled',
  });
}
