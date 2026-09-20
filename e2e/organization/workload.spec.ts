import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { checkWorkloadMemberSelectors } from '../support/helpers/member-selector';
import { checkCapacityEditorPresentation } from '../support/helpers/workload-capacity';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';
import { WorkloadPage } from '../support/pages/workload.page';

for (const dark of [false, true]) {
  test(
    'daily workload, keyboard detail and explicit capacity — ' + (dark ? 'dark' : 'light'),
    async ({ page, context, baseURL }, info) => {
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
      const errors = collectConsoleErrors(page);
      await new ApiMock(page).mockAuthenticatedSession();
      const api = new WorkloadApiMock(page);
      await api.projection(1, true, (output) => ({
        ...output,
        projection: {
          ...output.projection,
          members: output.projection.members.map((member) => ({
            ...member,
            days: member.days.map((day, index) =>
              index === 1 ? { ...day, remainingMinutes: 210, utilizationPercent: 50 } : day,
            ),
          })),
        },
      }));
      const directory = join(
        'e2e/artifacts/workload-refinement',
        process.env['FG_WORKLOAD_RUN'] ?? 'inspection',
        info.project.name,
        dark ? 'dark' : 'light',
      );
      await mkdir(directory, { recursive: true });
      const view = new WorkloadPage(page);
      await view.goto();
      await expect(view.matrix).toBeVisible();
      const filterHeight = await view.root
        .getByRole('button', { name: 'Filters', exact: true })
        .evaluate((element) => element.getBoundingClientRect().height);
      const toolbarHeights = await Promise.all(
        ['This week', 'Previous week', 'Next week', 'Configure capacity'].map((name) =>
          view.root
            .getByRole('button', { name, exact: true })
            .evaluate((element) => element.getBoundingClientRect().height),
        ),
      );
      expect(toolbarHeights).toEqual([filterHeight, filterHeight, filterHeight, filterHeight]);
      const memberHeader = view.matrix.getByRole('rowheader').first();
      await expect(memberHeader).toHaveAttribute('data-slot', 'table-head');
      await expect(memberHeader.locator('[data-slot="avatar"]')).toBeVisible();
      await expect(memberHeader.locator('[data-slot="avatar-fallback"]')).toHaveText('AF');
      const identity = memberHeader.getByTestId('workload-member-identity');
      await expect(identity.locator('span').first()).toHaveCSS('text-overflow', 'ellipsis');
      await expect(identity.locator('span').last()).toHaveCSS('text-overflow', 'ellipsis');
      await identity.hover();
      await expect(page.getByRole('tooltip')).toContainText(
        'Responsable de la maintenance et de la sécurité incendie',
      );
      await page.mouse.move(0, 0);
      await identity.focus();
      await expect(page.getByRole('tooltip')).toContainText('Alexandrie Fernández');
      await identity.press('Tab');
      await expect(
        memberHeader.getByText('Responsable de la maintenance et de la sécurité incendie', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(view.matrix.getByRole('columnheader').nth(1)).toHaveText('Mon 14');
      await expect(view.root.getByText('Sep 14, 2026 – Sep 20, 2026')).toBeVisible();
      await expect(view.root.getByText('Some work cannot be quantified')).toBeVisible();
      const partialDay = view.matrix.getByRole('button', { name: /2026-09-15/ });
      await expect(partialDay.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
      await expect(partialDay.getByTestId('workload-day-ring-value')).toHaveAttribute(
        'stroke-dashoffset',
        '50',
      );
      await expect(partialDay.getByText('3 h 30 min / 7 h', { exact: true })).toBeVisible();
      const emptyDay = view.matrix.getByRole('button', { name: /2026-09-14/ });
      await expect(emptyDay.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
      await expect(emptyDay.getByTestId('workload-day-ring-value')).toHaveCount(0);
      await expect(view.overloadedDay().getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '100',
      );
      await expect(view.overloadedDay().getByText('8 h / 7 h', { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: join(directory, 'workload-desktop.png'),
        animations: 'disabled',
      });
      /**
       * Function checkDayHover
       *
       * @description
       * Checks the circular track remains distinct on hover without a whole-row highlight.
       *
       * @param {string} date - Rendered day to hover.
       * @returns {Promise<void>}
       */
      const checkDayHover = async (date: string): Promise<void> => {
        const day = view.matrix.getByRole('button', { name: new RegExp(date) });
        await day.hover();
        const progress = day.getByRole('progressbar');
        await expect(progress).toBeVisible();
        const ringSize = await progress.boundingBox();
        expect(ringSize?.width).toBe(28);
        expect(ringSize?.height).toBe(28);
        const trackStroke = await day
          .getByTestId('workload-day-ring-track')
          .evaluate((element) => getComputedStyle(element).stroke);
        expect(trackStroke).not.toBe('none');
        await expect(day).not.toHaveCSS('background-color', trackStroke);
        await expect(
          view.matrix.getByRole('row').filter({
            has: page.getByRole('button', { name: new RegExp(date) }),
          }),
        ).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await page.screenshot({
          path: join(directory, `workload-hover-${date}.png`),
          animations: 'disabled',
        });
      };
      await checkDayHover('2026-09-15');
      await checkDayHover('2026-09-16');
      const unavailableDay = view.matrix.getByRole('button', {
        name: /2026-09-19, Unavailable$/,
      });
      await expect(unavailableDay).toHaveAttribute('data-unavailable', 'true');
      const unavailableColumn = view.matrix.locator('col[data-date="2026-09-19"]');
      await expect(unavailableColumn).toHaveCSS('background-image', /repeating-linear-gradient/);
      await expect(unavailableDay).toHaveCSS('background-image', 'none');
      const mutedColor = await unavailableDay
        .getByText('Unavailable', { exact: true })
        .evaluate((element) => getComputedStyle(element).color);
      await expect(unavailableDay.getByText('0 min / 0 min', { exact: true })).toHaveCSS(
        'color',
        mutedColor,
      );
      await unavailableDay.hover();
      await expect(unavailableColumn).toHaveCSS('background-image', /repeating-linear-gradient/);
      await page.screenshot({
        path: join(directory, 'workload-unavailable.png'),
        animations: 'disabled',
      });
      await page.mouse.move(0, 0);
      await unavailableDay.focus();
      await page.keyboard.press('Enter');
      await expect(
        view.detail.getByText('Saturday, September 19, 2026', { exact: true }),
      ).toBeVisible();
      await expect(view.detail.getByTestId('workload-day-empty')).toHaveCSS(
        'border-top-style',
        'dashed',
      );
      await page.screenshot({
        path: join(directory, 'workload-day-empty.png'),
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await expect(unavailableDay).toBeFocused();
      await view.overloadedDay().focus();
      await page.keyboard.press('Enter');
      await expect(view.detail.getByText('Time recorded', { exact: true }).first()).toBeVisible();
      await expect(view.detail.getByText('2 h', { exact: true }).first()).toBeVisible();
      await expect(view.detail.getByText('Over capacity by 1 h', { exact: true })).toBeVisible();
      await expect(view.detail.locator('hlm-avatar')).toBeVisible();
      await expect(
        view.detail.getByText('Wednesday, September 16, 2026', { exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: join(directory, 'workload-day.png'), animations: 'disabled' });
      await expect(
        view.detail.getByRole('link', { name: 'Emergency pump', exact: true }),
      ).toHaveCount(1);
      await expect(view.detail.getByTestId('workload-day-total')).toHaveText('8 h');
      await expect(
        view.detail.getByRole('link', { name: 'Emergency pump — estimate missing', exact: true }),
      ).toHaveCount(0);
      const excluded = view.detail.getByRole('button', {
        name: 'Work not included 1 task',
        exact: true,
      });
      await excluded.focus();
      await page.keyboard.press('Enter');
      await expect(excluded).toHaveAttribute('aria-expanded', 'true');
      await view.detail
        .getByRole('link', { name: 'Emergency pump — estimate missing', exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        view.detail.getByText('Remaining work not estimated', { exact: false }),
      ).toBeVisible();
      await expect(view.detail).toContainText("Across this member's work, not only this day.");
      await page.screenshot({
        path: join(directory, 'workload-day-excluded.png'),
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await expect(view.overloadedDay()).toBeFocused();
      await page.getByRole('button', { name: 'Configure capacity', exact: true }).click();
      await expect(page.getByLabel('Effective from')).toBeVisible();
      await expect(page.getByLabel('Effective from')).toContainText('Sep 16, 2026');
      await checkCapacityEditorPresentation(page, directory);
      await expect(page.getByRole('combobox', { name: 'Applies to' })).toBeEnabled();
      await expect(page.getByRole('textbox', { name: 'Monday Hours', exact: true })).toHaveValue(
        '7',
      );
      await expect(page.getByTestId('workload-capacity-total')).toHaveText('35 h');
      await expect(page.locator('hlm-field-error')).toHaveCount(0);
      await page.getByRole('textbox', { name: 'Monday Minutes', exact: true }).fill('30');
      await expect(page.getByTestId('workload-capacity-total')).toHaveText('35 h 30 min');
      await page
        .getByRole('button', { name: 'Repeat Monday on working days', exact: true })
        .click();
      await expect(page.getByTestId('workload-capacity-total')).toHaveText('37 h 30 min');
      await expect(page.getByRole('textbox', { name: 'Saturday Hours', exact: true })).toHaveValue(
        '0',
      );
      await page.getByRole('button', { name: 'Reset changes', exact: true }).click();
      await page.getByTestId('unsaved-changes-discard').click();
      await expect(page.getByTestId('workload-capacity-total')).toHaveText('35 h');
      await expect(page.getByRole('combobox', { name: 'Applies to' })).toBeEnabled();
      await page.getByRole('textbox', { name: 'Monday Minutes', exact: true }).fill('30');
      await page.screenshot({
        path: join(directory, 'workload-capacity.png'),
        animations: 'disabled',
      });
      await page.getByTestId('workload-capacity-total').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'workload-capacity-week.png'),
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Save availability', exact: true }).click();
      await expect(view.detail).toHaveCount(0);
      expect(api.capacityWrites).toEqual([
        { effectiveOn: '2026-09-16', minutes: [450, 420, 420, 420, 420, 0, 0] },
      ]);
      await checkWorkloadMemberSelectors(page, directory);
      expect(errors).toEqual([]);
    },
  );
}

test('paginates members and uses the shared filters, resetting pages when narrowing or changing weeks', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const errors = collectConsoleErrors(page);
  await new ApiMock(page).mockAuthenticatedSession();
  const api = new WorkloadApiMock(page);
  await api.projection(23);
  const view = new WorkloadPage(page);
  await view.goto();
  await expect(view.matrix.getByRole('row')).toHaveCount(11);
  await expect(page.getByTestId('workload-page-indicator')).toContainText('1');
  await page.getByTestId('workload-page-next').click();
  await expect(view.matrix.getByText('Member 11', { exact: true })).toBeVisible();
  await expect(view.matrix.getByRole('rowheader').first()).toContainText('No assigned role');
  await expect(
    view.matrix.getByRole('rowheader').first().locator('[data-slot="avatar-fallback"]'),
  ).toHaveText('M1');
  expect(api.projectionQueries.at(-1)?.get('page')).toBe('2');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByTestId('workload-filters-add').click();
  await page
    .getByTestId('workload-filters-add-option')
    .filter({ hasText: /^Load$/ })
    .click();
  await page.getByRole('option', { name: 'Overloaded', exact: true }).click();
  await expect(view.matrix.getByRole('row')).toHaveCount(2);
  expect(api.projectionQueries.at(-1)?.get('overloaded')).toBe('true');
  expect(api.projectionQueries.at(-1)?.get('page')).toBe('1');
  await expect(view.overloadedDay()).toContainText('Overload: 1 h');
  await page.getByTestId('workload-clear-filters').click();
  await expect(view.matrix.getByRole('row')).toHaveCount(11);
  await page.getByTestId('workload-filters-add').click();
  await page
    .getByTestId('workload-filters-add-option')
    .filter({ hasText: /^Team$/ })
    .click();
  await page.getByRole('option', { name: 'Maintenance', exact: true }).click();
  await expect(view.matrix.getByRole('row')).toHaveCount(3);
  expect(api.projectionQueries.at(-1)?.get('team')).toBe('team-1');
  await page.getByTestId('workload-filters-add').click();
  await page
    .getByTestId('workload-filters-add-option')
    .filter({ hasText: /^Member$/ })
    .click();
  await page
    .getByRole('option')
    .filter({ has: page.getByText('Member 02', { exact: true }) })
    .click();
  await expect(view.matrix.getByRole('row')).toHaveCount(2);
  expect(api.projectionQueries.at(-1)?.get('member')).toBe('workload-member-02');
  const directory = join(
    'e2e/artifacts/workload-refinement',
    process.env['FG_WORKLOAD_RUN'] ?? 'inspection',
    info.project.name,
    'filters',
  );
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, 'combined.png'), animations: 'disabled' });
  await page.getByTestId('workload-clear-filters').click();
  await expect(view.matrix.getByRole('row')).toHaveCount(11);
  await page.getByTestId('workload-page-size').click();
  await page.getByRole('option', { name: '20', exact: true }).click();
  await expect(view.matrix.getByRole('row')).toHaveCount(21);
  expect(api.projectionQueries.at(-1)?.get('pageSize')).toBe('20');
  await page.getByTestId('workload-page-next').click();
  await expect(view.matrix.getByRole('row')).toHaveCount(4);
  await page.getByRole('button', { name: 'Next week', exact: true }).click();
  await expect(view.matrix.getByRole('row')).toHaveCount(21);
  expect(api.projectionQueries.at(-1)?.get('page')).toBe('1');
  expect(api.projectionQueries.at(-1)?.get('from')).toBe('2026-09-21');
  expect(errors).toEqual([]);
});

test('keeps unknown hours blank, focuses validation and records a partial-day exception', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  await new ApiMock(page).mockAuthenticatedSession();
  const api = new WorkloadApiMock(page);
  await api.projection(1, false);
  const view = new WorkloadPage(page);
  await view.goto();
  await page.getByRole('button', { name: 'Configure capacity', exact: true }).click();
  await expect(page.locator('hlm-field-error')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save availability', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Monday Hours', exact: true })).toBeFocused();
  await expect(page.locator('hlm-field-error')).toHaveCount(7);
  // Real form interactions are sequential: concurrent fills would compete for keyboard focus.
  for (let day = 0; day < 7; day++) {
    // eslint-disable-next-line no-await-in-loop
    await page.locator(`#capacity-day-${day}-hours`).fill('0');
  }
  await page.locator('#capacity-day-0-minutes').fill('60');
  await page.getByRole('button', { name: 'Save availability', exact: true }).click();
  await expect(page.locator('hlm-field-error')).toHaveCount(1);
  const directory = join(
    'e2e/artifacts/workload-refinement',
    process.env['FG_WORKLOAD_RUN'] ?? 'inspection',
    info.project.name,
    'validation',
  );
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, 'error.png'), animations: 'disabled' });
  await page.locator('#capacity-day-0-minutes').fill('0');
  await page.getByRole('button', { name: 'Save availability', exact: true }).click();
  await expect(view.detail).toHaveCount(0);
  await page.getByRole('button', { name: 'Configure capacity', exact: true }).click();
  await page.getByRole('combobox', { name: 'Applies to' }).click();
  await page.getByRole('option').filter({ hasText: 'Alexandrie Fernández' }).click();
  await page.getByRole('button', { name: 'Absence or reduced hours', exact: true }).click();
  await page.getByRole('button', { name: 'Full absence · 0 h', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Available time per day Hours', exact: true }),
  ).toHaveValue('0');
  await page.getByRole('textbox', { name: 'Available time per day Hours', exact: true }).fill('3');
  await page
    .getByRole('textbox', { name: 'Available time per day Minutes', exact: true })
    .fill('30');
  await page.screenshot({
    path: join(directory, 'workload-exception.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Save availability', exact: true }).click();
  await expect(view.detail).toHaveCount(0);
  expect(api.exceptionWrites).toEqual([
    { startsOn: '2026-09-16', endsOn: '2026-09-16', minutes: 210 },
  ]);
});

test('offers a clear recovery action when combined filters find no members', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  await new ApiMock(page).mockAuthenticatedSession();
  const api = new WorkloadApiMock(page);
  await api.projection(2);
  const view = new WorkloadPage(page);
  await view.goto();
  await view.filterBy('Member', 'Member 02');
  await view.filterBy('Load', 'Overloaded');
  const empty = page.locator('[data-slot="empty"]');
  await expect(empty.getByText('No members match these filters', { exact: true })).toBeVisible();
  await empty.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(view.matrix.getByRole('rowheader')).toHaveCount(2);
  expect(api.projectionQueries.at(-1)?.has('member')).toBe(false);
  expect(api.projectionQueries.at(-1)?.has('overloaded')).toBe(false);
});
