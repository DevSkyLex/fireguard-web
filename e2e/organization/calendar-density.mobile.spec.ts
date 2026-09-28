import { expect, test } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
} from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test('keeps a crowded calendar day scrollable on a phone', async ({ page }) => {
  const today = new Date();
  const day = new Date(today.getFullYear(), today.getMonth(), 15);
  const items = Array.from({ length: 20 }, (unused, index) => {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, index * 30);
    const id = `mobile-dense-${index}`;
    return {
      sourceKey: 'calendar_event',
      id,
      title: `Site visit ${index + 1}`,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 25 * 60_000).toISOString(),
      allDay: false,
      targetType: 'calendar_event',
      targetId: id,
    };
  });

  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: [...ALL_ORGANIZATION_PERMISSIONS, 'organization.events.read'],
  });
  await api.mockCalendarFeed(E2E_ORGANIZATION_ID, items);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);

  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/calendar`);
  const agenda = page.getByTestId('calendar-agenda');
  await expect(agenda).toBeVisible();
  const entries = agenda.getByTestId('calendar-day-item');
  await expect(entries).toHaveCount(20);
  await expect(entries.first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: 'e2e/artifacts/calendar-density-mobile-top.png',
    animations: 'disabled',
  });

  await entries.last().scrollIntoViewIfNeeded();
  await expect(entries.last()).toBeVisible();
  const navigation = page.locator('#dashboard-mobile-navigation');
  await expect(navigation).toBeInViewport();
  const lastEntryBounds = await entries.last().boundingBox();
  const navigationBounds = await navigation.boundingBox();
  if (!lastEntryBounds || !navigationBounds)
    throw new Error('The last entry and navigation must fit.');
  expect(lastEntryBounds.y + lastEntryBounds.height).toBeLessThanOrEqual(navigationBounds.y);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: 'e2e/artifacts/calendar-density-mobile-bottom.png',
    animations: 'disabled',
  });
});
