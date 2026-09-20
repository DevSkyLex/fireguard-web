import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';
import { WorkloadPage } from '../support/pages/workload.page';

for (const dark of [false, true]) {
  test(`hatches unavailable columns continuously while preserving individual exceptions — ${dark ? 'dark' : 'light'}`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await page.setViewportSize({ width: 1592, height: 938 });
    await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await new ApiMock(page).mockAuthenticatedSession();
    await new WorkloadApiMock(page).projection(4, true, (output) => ({
      ...output,
      projection: {
        ...output.projection,
        members: output.projection.members.map((member, index) => ({
          ...member,
          days: member.days.map((day, weekday) => {
            const capacityMinutes =
              weekday === 4
                ? null
                : weekday === 6 && index === 3
                  ? 420
                  : weekday === 2 || weekday === 3 || (weekday === 1 && index === 0)
                    ? 0
                    : (day.capacityMinutes ?? null);
            return {
              ...day,
              capacityMinutes,
              overloadMinutes:
                capacityMinutes === null
                  ? null
                  : Math.max(0, day.actualMinutes + day.remainingMinutes - capacityMinutes),
              utilizationPercent: capacityMinutes
                ? (100 * (day.actualMinutes + day.remainingMinutes)) / capacityMinutes
                : null,
              availability:
                capacityMinutes === null
                  ? 'unknown'
                  : capacityMinutes === 0
                    ? 'unavailable'
                    : 'available',
            };
          }),
        })),
      },
    }));
    const view = new WorkloadPage(page);
    await view.goto();
    await expect(view.matrix.getByRole('rowheader')).toHaveCount(4);
    await expectNoHorizontalOverflow(page);
    await Promise.all(
      ['2026-09-16', '2026-09-17', '2026-09-19'].map(async (date) => {
        const column = view.matrix.locator(`col[data-date="${date}"]`);
        await expect(column).toHaveAttribute('data-unavailable', 'true');
        await expect(column).toHaveCSS('background-image', /repeating-linear-gradient/);
        const bounds = await column.evaluate((element) => {
          const table = element.closest('table');
          if (!table) throw new Error('The day column must belong to the workload table.');
          // WebKit paints column backgrounds but exposes an empty column DOMRect.
          const index = Array.from(table.querySelectorAll('col')).findIndex(
            (candidate) => candidate === element,
          );
          if (index < 0) throw new Error('The date must map to a native table column.');
          const cells = Array.from(table.rows, (row) => row.cells[index].getBoundingClientRect());
          const first = cells.at(0);
          const last = cells.at(-1);
          if (!first || !last) throw new Error('The day column must contain a header and cells.');
          const tableRect = table.getBoundingClientRect();
          return {
            topGap: first.top - tableRect.top,
            bottomGap: tableRect.bottom - last.bottom,
            rowGaps: cells.slice(1).map((cell, row) => cell.top - cells[row].bottom),
          };
        });
        expect(Math.abs(bounds.topGap)).toBeLessThanOrEqual(1);
        expect(Math.abs(bounds.bottomGap)).toBeLessThanOrEqual(1);
        expect(bounds.rowGaps.every((gap) => Math.abs(gap) <= 1)).toBe(true);
        const buttons = view.matrix.getByRole('button', {
          name: new RegExp(`${date}, Unavailable$`),
        });
        await expect(buttons).toHaveCount(4);
        await Promise.all(
          (await buttons.all()).map((button) =>
            expect(button).toHaveCSS('background-image', 'none'),
          ),
        );
      }),
    );
    await expect(view.matrix.getByRole('columnheader', { name: 'Wed 16' })).toHaveAttribute(
      'aria-current',
      'date',
    );
    await Promise.all(
      ['2026-09-15', '2026-09-18', '2026-09-20'].map((date) =>
        expect(view.matrix.locator(`col[data-date="${date}"]`)).toHaveAttribute(
          'data-unavailable',
          'false',
        ),
      ),
    );
    const personalAbsence = view.matrix
      .getByRole('cell')
      .filter({ has: page.getByRole('button', { name: /2026-09-15, Unavailable$/ }) });
    await expect(personalAbsence).toHaveCount(1);
    await expect(personalAbsence).toHaveCSS('background-image', /repeating-linear-gradient/);
    await expect(view.matrix.getByRole('button', { name: /2026-09-20, Available$/ })).toHaveCount(
      1,
    );
    const directory = join(
      'e2e/artifacts/workload-columns',
      process.env['FG_WORKLOAD_RUN'] ?? 'inspection',
      info.project.name,
      dark ? 'dark' : 'light',
    );
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: join(directory, 'columns.png'), animations: 'disabled' });
    const saturday = view.matrix.getByRole('button', { name: /2026-09-19, Unavailable$/ }).nth(1);
    await saturday.focus();
    await page.keyboard.press('Enter');
    await expect(
      view.detail.getByText('Saturday, September 19, 2026', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(saturday).toBeFocused();
  });
}
