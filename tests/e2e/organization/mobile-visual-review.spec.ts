import { devices, expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { MOBILE_VISUAL_MODES, selectVisualRoutes } from '../support/helpers/mobile-visual-matrix';
import { mockMobileVisualWorkspace } from '../support/helpers/mobile-visual-mocks';
import { visualRun } from '../support/helpers/visual-run';
import { MobileVisualReviewPage } from '../support/pages/mobile-visual-review.page';

/**
 * The android-tablet user agent `emulateMobilePlatform` pairs with — no Playwright device
 * preset covers a 1024px Android tablet, so this string is hand-composed like the rest of
 * this file's Chromium user agents.
 */
const ANDROID_TABLET_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

for (const mode of MOBILE_VISUAL_MODES) {
  test.describe(mode.name, () => {
    test.use({
      viewport: { width: mode.width, height: mode.height },
      contextOptions: {
        screen: { width: mode.width, height: mode.height },
        reducedMotion: 'reduce',
      },
      isMobile: mode.mobile,
      hasTouch: mode.mobile,
      deviceScaleFactor: 1,
      userAgent: async ({ browserName }, use) => {
        const value =
          browserName === 'webkit'
            ? mode.mobile
              ? mode.width === 1024
                ? devices['iPad (gen 7)'].userAgent
                : devices['iPhone 12'].userAgent
              : devices['Desktop Safari'].userAgent
            : mode.mobile
              ? mode.width === 1024
                ? ANDROID_TABLET_USER_AGENT
                : devices['Pixel 5'].userAgent
              : devices['Desktop Chrome'].userAgent;

        await use(value);
      },
      colorScheme: mode.theme,
    });

    for (const route of selectVisualRoutes(mode, visualRun().pass)) {
      test(`captures the settled ${route.id} page and checks its layout`, async ({
        page,
        context,
        baseURL,
        browserName,
      }, info) => {
        test.setTimeout(45_000);
        expect(
          new URL(baseURL ?? 'http://localhost:4273').port,
          'Hermetic review must use port 4273.',
        ).toBe('4273');
        if (mode.mobile)
          await emulateMobilePlatform(
            context,
            browserName === 'webkit'
              ? mode.width === 1024
                ? 'ipad'
                : 'ios'
              : mode.width === 1024
                ? 'android-tablet'
                : 'android',
          );
        await context.addCookies([
          {
            name: 'last-organization',
            value: E2E_ORGANIZATION_ID,
            url: baseURL ?? 'http://localhost:4273',
          },
          { name: 'theme-preference', value: mode.theme, url: baseURL ?? 'http://localhost:4273' },
        ]);
        await mockMobileVisualWorkspace(page, route.id);
        const review = new MobileVisualReviewPage(page);
        await review.inspect(route, mode, info);
      });
    }
  });
}
