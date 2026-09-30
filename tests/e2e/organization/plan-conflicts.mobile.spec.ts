import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { verifyPlanConflicts } from '../support/helpers/plan-conflicts';

test('keeps the coordinate draft and readable audit on mobile in dark mode', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, info.project.name === 'Mobile Safari' ? 'ios' : 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyPlanConflicts(page, info);
});
