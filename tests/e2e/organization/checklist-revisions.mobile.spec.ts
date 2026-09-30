import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyChecklistRevisions } from '../support/helpers/checklist-revisions';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
test('preserves revision drafts on mobile in dark mode', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, info.project.name === 'Mobile Safari' ? 'ios' : 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyChecklistRevisions(page, info);
});
