import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyCalendarCompleteness } from '../support/helpers/calendar-completeness';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

test('recovers the partial calendar on mobile in dark mode', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyCalendarCompleteness(page, info);
});
