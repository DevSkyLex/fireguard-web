import { expect, test } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
} from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

test('keeps the selected day in a resizable right slot and uses the agenda in a narrow window', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: [...ALL_ORGANIZATION_PERMISSIONS, 'organization.events.read'],
  });
  const today = new Date();
  const items = Array.from({ length: 24 }, (_, index) => {
    const startsAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, index);
    return {
      sourceKey: 'calendar_event',
      id: `panel-entry-${index}`,
      title: `Panel event ${index + 1}`,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(),
      allDay: false,
      targetType: 'calendar_event',
      targetId: `panel-entry-${index}`,
    };
  });
  await api.mockCalendarFeed(E2E_ORGANIZATION_ID, items);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);

  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/calendar`);
  const panel = page.locator('#dashboard-panel');
  const handle = page.getByTestId('dashboard-panel-resize-handle');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-panel-size', '24');
  await expect(handle).toHaveAttribute('role', 'separator');
  await expect(page.locator('#dashboard-main-panel')).toHaveAttribute('data-panel-size', '76');
  await expect(page.getByTestId('calendar-day-heading')).toBeVisible();
  const dayScroll = page.getByTestId('calendar-day-scroll-region');
  await expect(page.getByTestId('calendar-selected-day-panel')).toContainText('Panel event 24');
  const scrollMetrics = await dayScroll.evaluate((element) => ({
    height: element.clientHeight,
    contentHeight: element.scrollHeight,
  }));
  expect(scrollMetrics.contentHeight).toBeGreaterThan(scrollMetrics.height);
  const mainScrollBefore = await page
    .locator('#dashboard-main')
    .evaluate((element) => element.scrollTop);
  await dayScroll.hover();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => dayScroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('#dashboard-main').evaluate((element) => element.scrollTop)).toBe(
    mainScrollBefore,
  );

  const initialWidth = await panel.boundingBox();
  await handle.focus();
  await handle.press('ArrowLeft');
  await expect
    .poll(async () => (await panel.boundingBox())?.width ?? 0)
    .not.toBe(initialWidth?.width ?? 0);
  const handleBounds = await handle.boundingBox();
  const keyboardWidth = (await panel.boundingBox())?.width ?? 0;
  if (!handleBounds) throw new Error('The panel resize handle has no bounds');
  const handleX = handleBounds.x + handleBounds.width / 2;
  const handleY = handleBounds.y + handleBounds.height / 2;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX - 80, handleY, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).not.toBe(keyboardWidth);
  await page.screenshot({
    path: 'e2e/artifacts/calendar-right-panel-wide.png',
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 900, height: 800 });
  await expect(panel).toBeHidden();
  await expect(page.getByTestId('calendar-agenda')).toBeVisible();
  await expect(page.locator('app-calendar')).toBeHidden();
  await page.screenshot({
    path: 'e2e/artifacts/calendar-right-panel-narrow.png',
    animations: 'disabled',
  });
});

test('shows interventions in the right slot only while their calendar tab is active', async ({
  page,
  context,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [
    interventionOutput({
      id: 'right-panel-intervention',
      number: 72,
      name: 'Panel inspection',
      status: 'planned',
      plannedStartAt: start.toISOString(),
    }),
  ]);

  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=calendar`);
  await expect(page.getByTestId('intervention-calendar-day-panel')).toBeVisible();
  await expect(
    page.getByTestId('intervention-calendar-day-panel').getByTestId('intervention-calendar-entry'),
  ).toContainText('Panel inspection');
  await page.screenshot({
    path: 'e2e/artifacts/intervention-calendar-right-panel-wide.png',
    animations: 'disabled',
  });
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await page.reload();
  await expect(page.getByTestId('intervention-calendar-day-panel')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({
    path: 'e2e/artifacts/intervention-calendar-right-panel-dark.png',
    animations: 'disabled',
  });
  await page.getByTestId('intervention-view-toggle-board').first().click();
  await expect(page.locator('#dashboard-panel')).toHaveCount(0);

  await page.getByTestId('intervention-view-toggle-calendar').first().click();
  await expect(page.getByTestId('intervention-calendar-day-panel')).toBeVisible();
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(page.locator('#dashboard-panel')).toBeHidden();
  await expect(page.getByTestId('intervention-calendar-agenda')).toBeVisible();
});
