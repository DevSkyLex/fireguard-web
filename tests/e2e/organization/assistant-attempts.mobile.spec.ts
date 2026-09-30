import { test } from '@playwright/test';
import { verifyAssistantAttempts } from '../support/helpers/assistant-attempts';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
test('cancels and retries an assistant attempt on mobile', async ({ page, context }, info) => {
  await emulateMobilePlatform(context, info.project.name === 'Mobile Safari' ? 'ios' : 'android');
  await verifyAssistantAttempts(page, info);
});
