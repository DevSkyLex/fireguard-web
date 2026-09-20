import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { arrangeInterventionTime, openTimeJournal } from '../support/helpers/intervention-time';

test('logs manual time in a tactile bottom sheet without changing remaining effort', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const { path, mock } = await arrangeInterventionTime(page);
  await page.goto(path);
  await openTimeJournal(page);
  await page.getByTestId('time-new').tap();
  await page.getByLabel('Time spent (minutes)').fill('120');
  await page
    .getByLabel('Note (optional)')
    .fill('Maintenance terminée — contrôle du dispositif de sécurité incendie.');
  await page.getByRole('button', { name: 'Save time', exact: true }).tap();
  await expect(page.getByTestId('time-entry')).toContainText('Sep 16, 2026');
  await expect(page.getByTestId('time-entry')).toContainText('2 h');
  expect(mock.timeWrites).toHaveLength(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: info.outputPath('time-touch.png'), animations: 'disabled' });
});
