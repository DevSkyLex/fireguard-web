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
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';
import { WorkloadPage } from '../support/pages/workload.page';

for (const dark of [false, true]) {
  test(
    'groups excluded work into keyboard-accessible planning actions — ' + (dark ? 'dark' : 'light'),
    async ({ page, context, baseURL }, info) => {
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
      const errors = collectConsoleErrors(page);
      await new ApiMock(page).mockAuthenticatedSession();
      await new WorkloadApiMock(page).projection(2, true, withWorkloadPlanningIssues);
      const view = new WorkloadPage(page);
      await view.goto();
      const panel = page.getByRole('region', { name: 'Work to plan', exact: true });
      await expect(panel).toBeVisible();
      await expect(panel.getByRole('button')).toHaveCount(6);
      await expect(panel.getByRole('link')).toHaveCount(0);
      const directory = join(
        'e2e/artifacts/workload-refinement',
        process.env['FG_WORKLOAD_RUN'] ?? 'planning-inspection',
        info.project.name,
        dark ? 'dark' : 'light',
      );
      await mkdir(directory, { recursive: true });
      await panel.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'planning-collapsed.png'),
        animations: 'disabled',
      });
      const estimates = panel.getByRole('button', {
        name: 'Estimates to add 15 tasks',
        exact: true,
      });
      await estimates.focus();
      await page.keyboard.press('Enter');
      await expect(estimates).toHaveAttribute('aria-expanded', 'true');
      const details = panel.getByRole('region', { name: 'Estimates to add 15 tasks', exact: true });
      await expect(details.getByRole('listitem')).toHaveCount(8);
      await expect(details.getByText('Draft', { exact: true })).toBeVisible();
      await expect(details.getByRole('listitem').first()).toContainText('2 tasks');
      await expect(
        details.getByRole('listitem').first().locator('[data-slot="avatar"]'),
      ).toBeVisible();
      await expect(details.getByRole('listitem').first()).toContainText(
        'Responsable de la maintenance',
      );
      await expect(details.getByText(/0 min|not estimated/)).toHaveCount(0);
      const intervention = details.getByRole('listitem').first().getByRole('link');
      await intervention.focus();
      await expect(intervention).toBeFocused();
      const rowBounds = await details.getByRole('listitem').first().boundingBox();
      const linkBounds = await intervention.boundingBox();
      if (!rowBounds || !linkBounds) throw new Error('Planning row must have visible bounds.');
      expect(linkBounds.width).toBeGreaterThanOrEqual(rowBounds.width - 2);
      const identityBounds = await intervention.locator('[data-slot="avatar"]').boundingBox();
      const contentBounds = await intervention.locator('[data-slot="item-content"]').boundingBox();
      if (!identityBounds || !contentBounds) throw new Error('Planning context must be visible.');
      expect(identityBounds.x).toBeGreaterThan(contentBounds.x + contentBounds.width);
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(panel);
      await estimates.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'planning-estimates.png'),
        animations: 'disabled',
      });
      await estimates.focus();
      await page.keyboard.press('Space');
      await expect(estimates).toHaveAttribute('aria-expanded', 'false');
      await expect(estimates).toBeFocused();
      await panel.getByRole('button', { name: 'Tasks to assign 2 tasks', exact: true }).click();
      await expect(panel.getByText('3 h remaining', { exact: true })).toBeVisible();
      await expect(panel.getByRole('link', { name: 'Warehouse inventory' })).toHaveAttribute(
        'href',
        /\/interventions\//,
      );
      await panel.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'planning-unassigned.png'),
        animations: 'disabled',
      });
      await panel
        .getByRole('button', { name: 'Capacity to configure 1 task', exact: true })
        .click();
      const configure = panel.getByRole('button', { name: 'Configure capacity', exact: true });
      await configure.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(directory, 'planning-capacity.png'),
        animations: 'disabled',
      });
      await configure.focus();
      await page.keyboard.press('Enter');
      await expect(view.detail.getByRole('combobox', { name: 'Applies to' })).toHaveValue(
        /Alexandrie Fernández/,
      );
      await page.keyboard.press('Escape');
      await expect(view.detail).toHaveCount(0);
      await expect(configure).toBeFocused();
      await page.getByRole('button', { name: 'Next week', exact: true }).click();
      await expect(panel.getByRole('link')).toHaveCount(0);
      expect(errors).toEqual([]);
    },
  );
}
