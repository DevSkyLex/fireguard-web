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
import { CUSTOMER_ID, CUSTOMER_NAME, SITE_NAME, mockPark } from '../support/mocks/park-api-mock';
import { OrganizationParkPage } from '../support/pages/organization-park.page';

test.describe('Fire equipment park action queues', () => {
  for (const profile of ['operator', 'service_provider'] as const) {
    test(`keeps the three queues and their destinations scoped for the ${profile} profile`, async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      const consoleErrors = collectConsoleErrors(page);
      const requests = await mockPark(page, profile);
      const park = new OrganizationParkPage(page);
      await park.gotoDashboard(E2E_ORGANIZATION_ID);
      await expect(park.queues.locator('app-stat-tile')).toHaveCount(3);
      await expect(park.queue('Unavailable equipment')).toContainText('2');
      await expect(park.queue('Controls to prepare')).toContainText('4');
      await expect(park.queue('Anomalies to address')).toContainText('1');
      expect(
        requests.some(
          (request) =>
            request.path.endsWith('/equipment-summary') &&
            request.family === 'fire' &&
            request.customerId === null,
        ),
      ).toBe(true);
      if (profile === 'service_provider') await park.selectCustomer(CUSTOMER_NAME);
      await park.selectSite(SITE_NAME);
      await park.showAllEquipment();
      await expect(park.queue('Unavailable equipment')).toContainText('3');
      await expect(park.queue('Controls to prepare')).toContainText('5');
      await expect(park.queue('Anomalies to address')).toContainText('2');
      await expect
        .poll(() =>
          requests.some(
            (request) =>
              request.path.endsWith(`/facilities/${E2E_FACILITY_ID}/equipment-summary`) &&
              request.family === null &&
              request.customerId === (profile === 'service_provider' ? CUSTOMER_ID : null),
          ),
        )
        .toBe(true);
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(park.queues);
      await park.queues.screenshot({
        path: testInfo.outputPath('park-queues-light.png'),
        animations: 'disabled',
      });

      const controlsDestination = await park
        .queue('Controls to prepare')
        .getByRole('link')
        .getAttribute('href');
      const anomaliesDestination = await park
        .queue('Anomalies to address')
        .getByRole('link')
        .getAttribute('href');
      expect(controlsDestination).toBeTruthy();
      expect(anomaliesDestination).toBeTruthy();
      if (!controlsDestination || !anomaliesDestination) {
        throw new Error('Park queue links must provide their scoped destinations.');
      }
      await park.queue('Unavailable equipment').getByRole('link').click();
      await expect(page).toHaveURL(/queue=unavailable/u);
      await expect(park.equipmentLinks).toHaveCount(3);
      await expectNoHorizontalOverflow(page);
      await page.goto(controlsDestination);
      await expect(page).toHaveURL(/queue=controls/u);
      await expect(park.equipmentLinks).toHaveCount(5);
      expect(
        requests.some(
          (request) =>
            request.path.endsWith('/equipment') &&
            request.family === null &&
            request.facilityId === E2E_FACILITY_ID &&
            request.customerId === (profile === 'service_provider' ? CUSTOMER_ID : null),
        ),
      ).toBe(true);
      await page.goto(anomaliesDestination);
      await expect(page).toHaveURL(/queue=anomalies/u);
      await expect(park.anomalyPane.getByTestId('non-conformity-row')).toHaveCount(2);
      await expect
        .poll(() =>
          requests.some(
            (request) =>
              request.path.endsWith('/park-anomalies') &&
              request.family === null &&
              request.facilityId === E2E_FACILITY_ID &&
              request.customerId === (profile === 'service_provider' ? CUSTOMER_ID : null),
          ),
        )
        .toBe(true);
      await park.openSourceInspection('Missing tamper seal');
      await expect(page).toHaveURL(new RegExp(`/inspections/${E2E_INSPECTION_ID}$`, 'u'));
      await setDarkTheme(context, baseURL ?? 'http://127.0.0.1:4273');
      await park.gotoDashboard(E2E_ORGANIZATION_ID);
      if (profile === 'service_provider') await park.selectCustomer(CUSTOMER_NAME);
      await park.selectSite(SITE_NAME);
      await park.showAllEquipment();
      await expect(park.queue('Anomalies to address')).toContainText('2');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(park.queues);
      await park.queues.screenshot({
        path: testInfo.outputPath('park-queues-dark.png'),
        animations: 'disabled',
      });
      expect(consoleErrors).toEqual([]);
    });
  }
});
