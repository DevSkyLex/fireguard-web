import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { withWorkloadPlanningIssues } from '../support/fixtures/workload-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';
import { WorkloadPage } from '../support/pages/workload.page';

for (const dark of [false, true]) {
  test(
    'discloses long planning lists without crowding the tactile workload view — ' +
      (dark ? 'dark' : 'light'),
    async ({ page, context, baseURL }, info) => {
      await emulateMobilePlatform(
        context,
        info.project.name.includes('Safari') ? 'ios' : 'android',
      );
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
      const errors = collectConsoleErrors(page);
      await new ApiMock(page).mockAuthenticatedSession();
      await new WorkloadApiMock(page).projection(2, true, withWorkloadPlanningIssues);
      await new WorkloadPage(page).goto();
      const panel = page.getByRole('region', { name: 'Work to plan', exact: true });
      await expect(panel).toBeVisible();
      await panel.scrollIntoViewIfNeeded();
      const directory = join(
        'e2e/artifacts/workload-refinement',
        process.env['FG_WORKLOAD_RUN'] ?? 'planning-inspection',
        info.project.name,
        dark ? 'dark' : 'light',
      );
      await mkdir(directory, { recursive: true });
      await expect(panel.getByRole('link')).toHaveCount(0);
      await page.screenshot({
        path: join(directory, 'planning-collapsed.png'),
        animations: 'disabled',
      });
      const estimates = panel.getByRole('button', {
        name: 'Estimates to add 15 tasks',
        exact: true,
      });
      expect((await estimates.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await estimates.tap();
      const details = panel.getByRole('region', { name: 'Estimates to add 15 tasks', exact: true });
      await expect(details.getByRole('listitem')).toHaveCount(8);
      const intervention = details.getByRole('listitem').first().getByRole('link');
      const rowBounds = await details.getByRole('listitem').first().boundingBox();
      const linkBounds = await intervention.boundingBox();
      if (!rowBounds || !linkBounds) throw new Error('Planning row must have visible bounds.');
      expect(linkBounds.height).toBeGreaterThanOrEqual(44);
      expect(linkBounds.width).toBeGreaterThanOrEqual(rowBounds.width - 2);
      const identityBounds = await intervention.locator('[data-slot="avatar"]').boundingBox();
      const contentBounds = await intervention.locator('[data-slot="item-content"]').boundingBox();
      if (!identityBounds || !contentBounds) throw new Error('Planning context must be visible.');
      expect(identityBounds.y).toBeGreaterThan(contentBounds.y + contentBounds.height);
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(panel);
      await details.getByRole('listitem').first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'planning-estimates.png'),
        animations: 'disabled',
      });
      await estimates.tap();
      await expect(estimates).toHaveAttribute('aria-expanded', 'false');
      await panel.getByRole('button', { name: 'Tasks to assign 2 tasks', exact: true }).tap();
      await expect(panel.getByText('3 h remaining', { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await panel.getByRole('link').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'planning-unassigned.png'),
        animations: 'disabled',
      });
      expect(errors).toEqual([]);
    },
  );
}
