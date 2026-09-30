import { expect, test } from '@playwright/test';
import { collectConsoleErrors, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  mockPresenceScenario,
  presenceScenario,
  verifyPresenceControl,
} from '../support/helpers/presence';

for (const theme of ['light', 'dark'] as const) {
  test(`presence drawer confirms keyboard NPD and persists after reload in ${theme} theme`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await emulateMobilePlatform(context, info.project.name === 'Mobile Safari' ? 'ios' : 'android');
    const errors = collectConsoleErrors(page);
    await mockPresenceScenario(page, presenceScenario());
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await verifyPresenceControl(page, info, true);
    expect(errors).toEqual([]);
  });
}
