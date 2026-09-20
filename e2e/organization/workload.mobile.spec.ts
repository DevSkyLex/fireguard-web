import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { checkWorkloadMemberSelectors } from '../support/helpers/member-selector';
import { checkCapacityEditorPresentation } from '../support/helpers/workload-capacity';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';
import { WorkloadPage } from '../support/pages/workload.page';

for (const dark of [false, true]) {
  test(
    'tactile daily workload and bottom sheet — ' + (dark ? 'dark' : 'light'),
    async ({ page, context, baseURL }, info) => {
      await emulateMobilePlatform(
        context,
        info.project.name.includes('Safari') ? 'ios' : 'android',
      );
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
      const errors = collectConsoleErrors(page);
      await new ApiMock(page).mockAuthenticatedSession();
      const api = new WorkloadApiMock(page);
      await api.projection();
      const directory = join(
        'e2e/artifacts/workload-refinement',
        process.env['FG_WORKLOAD_RUN'] ?? 'inspection',
        info.project.name,
        dark ? 'dark' : 'light',
      );
      await mkdir(directory, { recursive: true });
      const view = new WorkloadPage(page);
      await view.goto();
      await expect(view.mobileList).toBeVisible();
      const toolbarHeights = await Promise.all(
        ['This week', 'Previous week', 'Next week', 'Filters', 'Configure capacity'].map((name) =>
          view.root
            .getByRole('button', { name, exact: true })
            .evaluate((element) => element.getBoundingClientRect().height),
        ),
      );
      expect(toolbarHeights.every((height) => height >= 44)).toBe(true);
      await expect(view.mobileList.locator('[data-slot="avatar"]')).toBeVisible();
      await expect(view.mobileList.locator('[data-slot="avatar-fallback"]')).toHaveText('AF');
      await expect(
        view.mobileList.getByText('Responsable de la maintenance et de la sécurité incendie', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(view.matrix).toHaveCount(0);
      const ring = view.overloadedDay().getByRole('progressbar');
      await expect(ring).toHaveAttribute('aria-valuenow', '100');
      await expect(view.overloadedDay().getByTestId('workload-day-ring-value')).toHaveAttribute(
        'stroke-dashoffset',
        '0',
      );
      const ringBounds = await ring.boundingBox();
      const totalBounds = await view
        .overloadedDay()
        .getByText('8 h / 7 h', { exact: true })
        .boundingBox();
      if (!ringBounds || !totalBounds)
        throw new Error('The daily ring and totals must be visible.');
      expect(ringBounds.x + ringBounds.width).toBeLessThan(totalBounds.x);
      expect(Math.abs(ringBounds.y - totalBounds.y)).toBeLessThan(16);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: join(directory, 'workload-touch.png'),
        animations: 'disabled',
      });
      const unavailableDay = view.mobileList.getByRole('button', {
        name: /^Sat 19 .*Unavailable$/,
      });
      await expect(unavailableDay).toHaveAttribute('data-unavailable', 'true');
      await expect(unavailableDay).toHaveCSS('background-image', /repeating-linear-gradient/);
      await unavailableDay.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'workload-touch-unavailable.png'),
        animations: 'disabled',
      });
      await unavailableDay.tap();
      await expect(
        view.detail.getByText('Saturday, September 19, 2026', { exact: true }),
      ).toBeVisible();
      await expect(view.detail.getByTestId('workload-day-empty')).toHaveCSS(
        'border-top-style',
        'dashed',
      );
      await page.screenshot({
        path: join(directory, 'workload-touch-day-empty.png'),
        animations: 'disabled',
      });
      await view.detail.getByRole('button', { name: 'Close', exact: true }).first().tap();
      await expect(view.detail).toHaveCount(0);
      await view.overloadedDay().tap();
      await expect(view.detail).toBeVisible();
      await expect(view.detail.getByText('Over capacity by 1 h', { exact: true })).toBeVisible();
      await expect(view.detail.locator('hlm-avatar')).toBeVisible();
      const metricPositions = await view.detail
        .getByRole('region', { name: 'Daily workload', exact: true })
        .locator('dl')
        .nth(1)
        .locator('dd')
        .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
      expect(Math.abs(metricPositions[0] - metricPositions[1])).toBeLessThan(1);
      expect(
        await view.detail
          .getByRole('link', { name: 'Emergency pump', exact: true })
          .evaluate((element) => element.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: join(directory, 'workload-touch-day.png'),
        animations: 'disabled',
      });
      await expect(
        view.detail.getByRole('link', { name: 'Emergency pump', exact: true }),
      ).toHaveCount(1);
      const excluded = view.detail.getByRole('button', {
        name: 'Work not included 1 task',
        exact: true,
      });
      expect(
        await excluded.evaluate((element) => element.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      await excluded.tap();
      await expect(excluded).toHaveAttribute('aria-expanded', 'true');
      await view.detail
        .getByRole('link', { name: 'Emergency pump — estimate missing', exact: true })
        .scrollIntoViewIfNeeded();
      expect(
        await view.detail
          .getByRole('link', { name: 'Emergency pump — estimate missing', exact: true })
          .evaluate((element) => element.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: join(directory, 'workload-touch-day-excluded.png'),
        animations: 'disabled',
      });
      await expect(
        view.detail.getByRole('heading', { name: /Alexandrie Fernández/ }),
      ).toBeInViewport({ ratio: 1 });
      await expect(
        view.detail.locator('hlm-sheet-footer').getByRole('button', { name: 'Close', exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await view.detail.getByRole('button', { name: 'Close', exact: true }).first().tap();
      await expect(view.detail).toHaveCount(0);
      await view.filterBy('Load', 'Overloaded', true);
      await expect(view.overloadedDay()).toBeVisible();
      expect(api.projectionQueries.at(-1)?.get('overloaded')).toBe('true');
      await page.getByRole('button', { name: 'Configure capacity', exact: true }).tap();
      await checkCapacityEditorPresentation(page, directory, true);
      await expect(page.getByRole('textbox', { name: 'Monday Hours', exact: true })).toHaveValue(
        '7',
      );
      await page.locator('#capacity-day-0-minutes').fill('60');
      await page.getByRole('button', { name: 'Save availability', exact: true }).tap();
      await expect(page.locator('hlm-field-error')).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: join(directory, 'workload-touch-capacity-error.png'),
        animations: 'disabled',
      });
      await page.locator('#capacity-day-0-minutes').fill('30');
      await expect(page.getByTestId('workload-capacity-total')).toHaveText('35 h 30 min');
      await page.getByRole('button', { name: 'Repeat Monday on working days', exact: true }).tap();
      await expect(page.getByTestId('workload-capacity-total')).toHaveText('37 h 30 min');
      await page.getByRole('button', { name: 'Reset changes', exact: true }).tap();
      await page.getByTestId('unsaved-changes-discard').tap();
      await expect(page.getByTestId('workload-capacity-total')).toHaveText('35 h');
      await page.locator('#capacity-day-0-minutes').fill('30');
      await page.screenshot({
        path: join(directory, 'workload-touch-capacity.png'),
        animations: 'disabled',
      });
      await page.getByTestId('workload-capacity-total').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'workload-touch-capacity-week.png'),
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Save availability', exact: true }).tap();
      await expect(view.detail).toHaveCount(0);
      expect(api.capacityWrites[0]?.minutes[0]).toBe(450);
      await checkWorkloadMemberSelectors(page, directory, true);
      expect(errors).toEqual([]);
    },
  );
}

test('paginates the tactile member list and resets it when a member is selected', async ({
  page,
  context,
}, info) => {
  await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  await new ApiMock(page).mockAuthenticatedSession();
  const api = new WorkloadApiMock(page);
  await api.projection(12);
  const view = new WorkloadPage(page);
  await view.goto();
  await expect(view.mobileList.getByRole('heading')).toHaveCount(10);
  await page.getByTestId('workload-page-next').tap();
  await expect(view.mobileList.getByRole('heading')).toHaveCount(2);
  await expect(view.mobileList.getByRole('heading').first()).toHaveText('Member 11');
  await view.filterBy('Member', 'Member 02', true);
  await expect(view.mobileList.getByRole('heading')).toHaveCount(1);
  await expect(view.mobileList.getByRole('heading')).toHaveText('Member 02');
  await expect(view.mobileList.getByText('No assigned role', { exact: true })).toBeVisible();
  await expect(view.mobileList.locator('[data-slot="avatar-fallback"]')).toHaveText('M0');
  expect(api.projectionQueries.at(-1)?.get('page')).toBe('1');
  await expectNoHorizontalOverflow(page);
});
