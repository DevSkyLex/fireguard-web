import { test } from '@playwright/test';
import { verifyAutomationHistory } from '../support/helpers/automation-history';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
test('shows automation history on mobile', async ({ page, context }, info) => {
  await emulateMobilePlatform(context, info.project.name === 'Mobile Safari' ? 'ios' : 'android');
  await verifyAutomationHistory(page, info);
});
