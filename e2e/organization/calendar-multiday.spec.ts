import { expect, test } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
} from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const dark of [false, true]) {
  test(`shows uninterrupted multi-day bars across week rows in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');

    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstMonday = new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate() + ((8 - first.getDay()) % 7),
    );
    const start = new Date(
      firstMonday.getFullYear(),
      firstMonday.getMonth(),
      firstMonday.getDate() + 5,
      9,
    );
    const end = new Date(
      firstMonday.getFullYear(),
      firstMonday.getMonth(),
      firstMonday.getDate() + 8,
      17,
    );
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: [...ALL_ORGANIZATION_PERMISSIONS, 'organization.events.read'],
    });
    await api.mockCalendarFeed(E2E_ORGANIZATION_ID, [
      {
        sourceKey: 'calendar_event',
        id: 'multi-day',
        title: 'Multi-day inspection',
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        allDay: false,
        targetType: 'calendar_event',
        targetId: 'multi-day',
      },
    ]);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/calendar`);
    const segments = page.locator('[data-event-id="calendar_event:multi-day"]');
    await expect(segments).toHaveCount(2);
    await expect(segments.first()).toBeVisible();
    await expect(segments.last()).toBeVisible();
    await expect(segments.first()).toHaveAttribute('data-span-days', '2');
    await expect(segments.last()).toHaveAttribute('data-span-days', '2');

    const firstBar = await segments.first().boundingBox();
    const firstDay = await page
      .locator(
        `[data-day="${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}"]`,
      )
      .boundingBox();
    if (!firstBar || !firstDay) throw new Error('The event and its starting day must be visible.');
    expect(firstBar.width).toBeGreaterThan(firstDay.width * 1.7);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `e2e/artifacts/calendar-multiday-${dark ? 'dark' : 'light'}.png`,
      animations: 'disabled',
    });
  });
}
