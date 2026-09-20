import { expect, test } from '@playwright/test';
import { collectConsoleErrors } from '../support/helpers/appearance';
import { arrangeInterventionTime, openTimeJournal } from '../support/helpers/intervention-time';
import { readOutboxOperations, setAppOffline, setAppOnline } from '../support/helpers/offline';

test('rechecks explicit overload consent when its assessment becomes stale', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const { path, item } = await arrangeInterventionTime(page);
  const writes: {
    readonly body: Record<string, unknown>;
    readonly revision: string | undefined;
  }[] = [];
  await page.route('**/api/intervention-work-items/' + item.id, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: item });
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push({ body, revision: route.request().headers()['if-match'] });
    if (writes.length < 3) {
      return route.fulfill({
        status: 409,
        json: {
          '@id': '/errors/workload',
          '@type': 'Error',
          status: 409,
          title: 'Workload confirmation required',
          detail: 'Daily capacity would be exceeded.',
          code: 'workload_confirmation_required',
          assessment: {
            confirmationRequired: true,
            confirmationToken: 'assessment-' + writes.length,
            completeness: 'complete',
            increases: [
              {
                memberId: 'e2e-member-1',
                memberName: 'Ella Uzer',
                date: '2026-09-16',
                reason: 'daily_overload',
                beforeMinutes: 0,
                afterMinutes: 60 * writes.length,
                capacityMinutes: 420,
              },
            ],
          },
        },
      });
    }
    await route.fulfill({ json: { ...item, ...body, revision: 2 } });
  });
  await page.goto(path);
  await page.getByTestId('intervention-work-item-menu').click();
  await page.getByRole('menuitem', { name: 'Plan this task', exact: true }).click();
  await page.getByLabel('Work starts on').fill('2026-09-16');
  await page.getByLabel('Work ends on').fill('2026-09-16');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toContainText('Ella Uzer');
  await expect(confirmation).toContainText('Overload: 0 min → 1 h');
  await expect(confirmation).toContainText('Capacity: 7 h');
  await expect(confirmation).toContainText('Sep 16, 2026');
  expect(writes).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath('workload-confirmation.png'),
    animations: 'disabled',
  });
  await page.getByTestId('workload-confirm').click();
  await expect(confirmation).toContainText('Overload: 0 min → 2 h');
  expect(writes).toHaveLength(2);
  await page.getByTestId('workload-confirm').click();
  await expect(confirmation).toHaveCount(0);
  await expect.poll(() => writes.length).toBe(3);
  expect(writes.map((write) => write.body['workloadConfirmationToken'])).toEqual([
    undefined,
    'assessment-1',
    'assessment-2',
  ]);
  expect(writes.map((write) => write.revision)).toEqual([
    writes[0]?.revision,
    writes[0]?.revision,
    writes[0]?.revision,
  ]);
  expect(writes[0]?.revision).toBeTruthy();
  expect(writes[2]?.body['workStartsOn']).toBe('2026-09-16');
});

test('keeps an offline time entry and replays its stable identifier once', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const errors = collectConsoleErrors(page);
  const { path, mock } = await arrangeInterventionTime(page);
  await page.goto(path);
  await openTimeJournal(page);
  await expect(page.getByTestId('time-new')).toBeVisible();
  await setAppOffline(page);
  await page.getByTestId('time-new').click();
  await page.getByLabel('Time spent (minutes)').fill('30');
  await page.getByLabel('Note (optional)').fill('Recorded in the field without network');
  await page.getByRole('button', { name: 'Save time', exact: true }).click();
  await expect(page.getByTestId('time-entry')).toContainText('Awaiting synchronization');
  const queued = await readOutboxOperations(page);
  expect(queued).toHaveLength(1);
  expect(queued[0]?.type).toBe('time-entry.create');
  expect(mock.timeWrites).toHaveLength(0);
  await page.screenshot({ path: info.outputPath('time-offline.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await openTimeJournal(page);
  await expect(page.getByTestId('time-entry')).toContainText('30 min');
  await setAppOnline(page);
  await expect.poll(() => mock.timeWrites.length).toBe(1);
  await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(0);
  expect(mock.timeWrites[0]?.id).toBe(queued[0]?.payload['id']);
  await page.getByRole('button', { name: 'Refresh journal', exact: true }).click();
  await expect(page.getByTestId('time-entry')).toHaveCount(1);
  await expect(page.getByTestId('time-entry')).not.toContainText('Awaiting synchronization');
  expect(errors).toEqual([]);
});
