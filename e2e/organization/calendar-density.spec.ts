import { expect, test } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
} from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

const isoDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

for (const dark of [false, true]) {
  test(`keeps a crowded month readable in ${dark ? 'dark' : 'light'} mode`, async ({
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
    const sourceKeys = ['calendar_event', 'inspection', 'intervention', 'maintenance'];
    const items: Array<{
      sourceKey: string;
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      allDay: boolean;
      targetType: string;
      targetId: string;
    }> = [];

    for (let day = 1; day <= 28; day += 1) {
      for (let source = 0; source < sourceKeys.length; source += 1) {
        const sourceKey = sourceKeys[source] ?? 'calendar_event';
        const start = new Date(first.getFullYear(), first.getMonth(), day, 9 + source);
        const id = `daily-${day}-${source}`;
        items.push({
          sourceKey,
          id,
          title: `${sourceKey} item ${day}`,
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + 45 * 60_000).toISOString(),
          allDay: false,
          targetType: sourceKey,
          targetId: id,
        });
      }
    }

    for (let week = 0; week < 4; week += 1) {
      for (let lane = 0; lane < 2; lane += 1) {
        const id = `multi-${week}-${lane}`;
        const start = new Date(
          firstMonday.getFullYear(),
          firstMonday.getMonth(),
          firstMonday.getDate() + week * 7 + 4,
          8 + lane,
        );
        const end = new Date(
          firstMonday.getFullYear(),
          firstMonday.getMonth(),
          firstMonday.getDate() + week * 7 + 8,
          17,
        );
        items.push({
          sourceKey: 'calendar_event',
          id,
          title: `Extended operation ${week + 1} ${lane + 1}`,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          allDay: false,
          targetType: 'calendar_event',
          targetId: id,
        });
      }
    }

    const crowdedDay = new Date(
      firstMonday.getFullYear(),
      firstMonday.getMonth(),
      firstMonday.getDate() + 8,
    );
    for (let index = 0; index < 10; index += 1) {
      const id = `extra-${index}`;
      const start = new Date(
        crowdedDay.getFullYear(),
        crowdedDay.getMonth(),
        crowdedDay.getDate(),
        13 + index,
      );
      items.push({
        sourceKey: 'calendar_event',
        id,
        title: `Additional visit ${index + 1}`,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + 30 * 60_000).toISOString(),
        allDay: false,
        targetType: 'calendar_event',
        targetId: id,
      });
    }

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: [...ALL_ORGANIZATION_PERMISSIONS, 'organization.events.read'],
    });
    await api.mockCalendarFeed(E2E_ORGANIZATION_ID, items);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/calendar`);
    const day = page.locator(`[data-day="${isoDay(crowdedDay)}"]`);
    await expect(day).toContainText('16 events');
    await expect(day.getByText('+14', { exact: true })).toBeVisible();
    await expect(page.locator('[data-event-id="calendar_event:multi-0-0"]')).toHaveCount(2);
    await day.locator('span').first().click();
    await expect(
      page.locator('[data-testid="calendar-selected-day-panel"] [data-testid="calendar-day-item"]'),
    ).toHaveCount(16);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `e2e/artifacts/calendar-density-${dark ? 'dark' : 'light'}.png`,
      animations: 'disabled',
    });
  });
}
