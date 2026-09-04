import { expect, test } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
} from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const mode of [
  { width: 1562, dark: true },
  { width: 1562, dark: false },
  { width: 375, dark: true },
  { width: 320, dark: false },
]) {
  test(
    'keeps the calendar view switcher stationary at ' + mode.width + 'px ' + mode.dark,
    async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width: mode.width, height: 938 });
      if (mode.dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
        permissions: [
          ...ALL_ORGANIZATION_PERMISSIONS,
          'organization.events.read',
          'organization.events.write',
        ],
      });
      await api.mockCalendarFeed(E2E_ORGANIZATION_ID);
      await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
      await page.route(/\/calendar\/feed-token$/, (route) => {
        if (route.request().method() !== 'GET')
          throw new Error('This check must not create a feed token.');
        return route.fulfill({ status: 404, contentType: 'application/ld+json', body: '{}' });
      });
      await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/calendar');
      const selector = page.getByTestId('calendar-granularity-toggle');
      await expect(selector).toBeVisible();
      const initial = await selector.boundingBox();
      if (!initial) throw new Error('The view switcher must have visible bounds.');
      const checkView = async (view: string): Promise<void> => {
        await page.getByTestId('calendar-granularity-' + view).click();
        await expect(page.getByTestId('calendar-granularity-' + view)).toHaveAttribute(
          'aria-selected',
          'true',
        );
        const bounds = await selector.boundingBox();
        if (!bounds) throw new Error('The view switcher must remain visible.');
        expect(Math.abs(bounds.x - initial.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(bounds.y - initial.y)).toBeLessThanOrEqual(1);
        await expectNoHorizontalOverflow(page);
        await page.screenshot({
          path:
            'e2e/artifacts/calendar-toolbar-' + mode.width + '-' + mode.dark + '-' + view + '.png',
          animations: 'disabled',
        });
      };
      await checkView('week');
      await checkView('day');
      await checkView('month');
      const menu = page.getByTestId('calendar-actions-menu');
      await menu.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: 'Subscribe (iCal)', exact: true }).click();
      await expect(page.getByTestId('calendar-feed-subscribe-dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByTestId('calendar-new-event').click();
      await expect(page.getByTestId('calendar-event-sheet')).toBeVisible();
    },
  );
}
