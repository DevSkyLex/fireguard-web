import { expect, test, devices } from '@playwright/test';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

for (const platform of ['ios', 'ipad'] as const) {
  test(`keeps ${platform} device evidence consistent with the browser's native touch context`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...devices[platform === 'ios' ? 'iPhone 12' : 'iPad Pro 11 landscape'],
      serviceWorkers: 'block',
    });
    try {
      await emulateMobilePlatform(context, platform);
      const page = await context.newPage();
      await page.route('http://mobile-harness.test/', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<meta name="viewport" content="width=device-width, initial-scale=1"><button style="min-height:44px" ontouchstart="this.dataset.touched=\'true\'" onclick="this.textContent=\'Tapped\'">Touch action</button>',
        }),
      );
      await page.goto('http://mobile-harness.test/');
      const signals = await page.evaluate(() => ({
        platform: navigator.platform,
        touchPoints: navigator.maxTouchPoints,
        coarsePointer: matchMedia('(pointer: coarse)').matches,
        hover: matchMedia('(hover: hover)').matches,
      }));
      expect(signals.platform).toBe(platform === 'ios' ? 'iPhone' : 'MacIntel');
      expect(signals.touchPoints).toBeGreaterThan(0);
      expect(signals.coarsePointer).toBe(true);
      expect(signals.hover).toBe(false);
      await page.getByRole('button', { name: 'Touch action', exact: true }).tap();
      await expect(page.getByRole('button', { name: 'Tapped', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tapped', exact: true })).toHaveAttribute(
        'data-touched',
        'true',
      );
    } finally {
      await context.close();
    }
  });

  test(`preserves native desktop touch evidence when ${platform} platform emulation has no touch preset`, async ({
    page,
    context,
  }) => {
    const nativeTouchPoints = await page.evaluate(() => navigator.maxTouchPoints);
    await emulateMobilePlatform(context, platform);
    await page.route('http://desktop-harness.test/', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<p>Desktop device harness</p>' }),
    );
    await page.goto('http://desktop-harness.test/');
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBe(nativeTouchPoints);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(false);
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(true);
  });
}
