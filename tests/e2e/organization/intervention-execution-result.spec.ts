import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import {
  recordConfirmedReplacementResult,
  recordOfflineMaintenanceResult,
} from '../support/helpers/intervention-execution';

for (const theme of ['light', 'dark'] as const) {
  test(`records the actual maintenance attempt offline and replays it in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const errors = collectConsoleErrors(page);
    await recordOfflineMaintenanceResult(page);
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test(`confirms a real replacement successor and replays completion in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const errors = collectConsoleErrors(page);
    await recordConfirmedReplacementResult(page);
    expect(errors).toEqual([]);
  });
}
