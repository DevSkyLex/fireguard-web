import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_FACILITY_ID } from '../support/fixtures/facility-fixtures';
import { E2E_INSPECTION_ID } from '../support/fixtures/inspection-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { CUSTOMER_ID, CUSTOMER_NAME, SITE_NAME, mockPark } from '../support/mocks/park-api-mock';
import { OrganizationParkPage } from '../support/pages/organization-park.page';

test('opens the three customer and site queues through native touch navigation', async ({
  page,
  context,
  browserName,
  baseURL,
}, testInfo) => {
  test.setTimeout(60_000);
  const originalViewport = page.viewportSize();
  expect(originalViewport?.width).toBeLessThan(500);
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
  const consoleErrors = collectConsoleErrors(page);
  const requests = await mockPark(page, 'service_provider');
  const park = new OrganizationParkPage(page, true);
  await park.gotoDashboard(E2E_ORGANIZATION_ID);
  await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
  await expect(page.locator('#organization-mobile-navigation a').first()).toHaveAttribute(
    'data-destination',
    'assets',
  );
  await expect(park.queue('Unavailable equipment')).toContainText('2');
  await expect(park.queue('Controls to prepare')).toContainText('4');
  await expect(park.queue('Anomalies to address')).toContainText('1');

  const destinations = [
    { name: 'Unavailable equipment', queue: 'unavailable', total: 3 },
    { name: 'Controls to prepare', queue: 'controls', total: 5 },
    { name: 'Anomalies to address', queue: 'anomalies', total: 2 },
  ] as const;
  const verifyDestination = async (
    index: number,
    destination: (typeof destinations)[number],
  ): Promise<void> => {
    if (index > 0) await park.gotoDashboard(E2E_ORGANIZATION_ID);
    await park.selectCustomer(CUSTOMER_NAME);
    await park.selectSite(SITE_NAME);
    await park.showAllEquipment();
    await expect(park.queue(destination.name)).toContainText(String(destination.total));
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(park.queues);
    if (index === 0) {
      await park.queues.screenshot({
        path: testInfo.outputPath('park-queues-mobile-light.png'),
        animations: 'disabled',
      });
    }
    await park.openQueue(destination.name);
    await expect(page).toHaveURL(new RegExp(`queue=${destination.queue}`, 'u'));
    await expect(page).toHaveURL(new RegExp(`customerId=${CUSTOMER_ID}`, 'u'));
    await expect(page).toHaveURL(new RegExp(`facility=${E2E_FACILITY_ID}`, 'u'));
    await expect(park.park.getByTestId('assets-detail-panel')).toBeVisible();
    if (destination.queue === 'anomalies') {
      await expect(park.anomalyPane.getByTestId('non-conformity-row')).toHaveCount(
        destination.total,
      );
    } else {
      await expect(park.equipmentLinks).toHaveCount(destination.total);
      await expect(park.equipmentPane.getByTestId('assets-equipment-cards')).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  };
  await verifyDestination(0, destinations[0]);
  await verifyDestination(1, destinations[1]);
  await verifyDestination(2, destinations[2]);
  expect(
    requests.some(
      (request) =>
        request.path.endsWith('/park-anomalies') &&
        request.family === null &&
        request.customerId === CUSTOMER_ID &&
        request.facilityId === E2E_FACILITY_ID,
    ),
  ).toBe(true);
  await park.openSourceInspection('Missing tamper seal');
  await expect(page).toHaveURL(new RegExp(`/inspections/${E2E_INSPECTION_ID}$`, 'u'));

  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await park.gotoDashboard(E2E_ORGANIZATION_ID);
  await park.selectCustomer(CUSTOMER_NAME);
  await park.selectSite(SITE_NAME);
  await park.showAllEquipment();
  await expect(park.queue('Anomalies to address')).toContainText('2');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(park.queues);
  await park.queues.screenshot({
    path: testInfo.outputPath('park-queues-mobile-dark.png'),
    animations: 'disabled',
  });
  expect(page.viewportSize()).toEqual(originalViewport);
  expect(consoleErrors).toEqual([]);
});
