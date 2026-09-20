import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { arrangeInterventionTime, openTimeJournal } from '../support/helpers/intervention-time';

test('records two hours without subtracting from three hours remaining', async ({ page }, info) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const errors = collectConsoleErrors(page);
  const { path, mock } = await arrangeInterventionTime(page);
  await page.goto(path);
  await openTimeJournal(page);
  await page.getByTestId('time-new').click();
  await page.getByLabel('Time spent (minutes)').fill('120');
  await page.getByLabel('Note (optional)').fill('Emergency pump maintenance');
  await page.screenshot({ path: info.outputPath('time-form.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Save time', exact: true }).click();
  await expect(page.getByTestId('time-entry')).toContainText('2 h');
  await expect(page.getByTestId('time-entry')).toContainText('Sep 16, 2026');
  await expect(page.getByTestId('time-entry')).toContainText('Emergency pump maintenance');
  expect(mock.timeWrites).toHaveLength(1);
  expect(mock.timeWrites[0]?.workedOn).toBe('2026-09-16');
  expect(mock.timeWrites[0]).not.toHaveProperty('remainingMinutes');
  expect(mock.timeWrites[0]).not.toHaveProperty('status');
  await page.screenshot({ path: info.outputPath('time-journal.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(
    page.getByText('Estimated 5 h · Spent 0 min · Remaining 3 h').filter({ visible: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
