import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { verifyUnifiedInbox } from '../support/helpers/unified-inbox';

test('recovers the unified inbox on mobile in dark mode', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, info.project.name === 'Mobile Safari' ? 'ios' : 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyUnifiedInbox(page, info);
});
