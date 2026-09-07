import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 1024, height: 360 },
]) {
  for (const dark of [false, true]) {
    test(`centers errors with reachable actions at ${viewport.width}px ${dark ? 'dark' : 'light'}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await page.setViewportSize(viewport);
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await new ApiMock(page).mockUnauthenticatedSession();
      for (const [code, id] of [
        ['404', 'not-found-page'],
        ['403', 'forbidden-page'],
        ['500', 'server-error-page'],
      ]) {
        // eslint-disable-next-line no-await-in-loop
        await test.step(code, async () => {
          await page.goto(
            `/error/${code}?from=${encodeURIComponent('/fr/onboarding/create?returnUrl=%2Forganizations')}`,
          );
          const content = page.locator(`#${id}`);
          await expect(content).toBeVisible();
          await expectNoHorizontalOverflow(page);
          const box = await content.boundingBox();
          const main = await page.locator('#focused-layout-content').boundingBox();
          if (!box || !main) throw new Error('Error content must have a layout.');
          expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
          expect(box.y).toBeGreaterThanOrEqual(main.y);
          if (box.height + 80 < main.height) {
            expect(Math.abs(box.y + box.height / 2 - main.y - main.height / 2)).toBeLessThan(2);
          }
          await expect(content.locator('h1')).toHaveCSS(
            'font-size',
            viewport.width < 640 ? '30px' : '36px',
          );
          const actions = content.locator('button, a');
          const sizes = await actions.evaluateAll((elements) =>
            elements.map((element) => element.getBoundingClientRect().height),
          );
          expect(sizes.every((height) => height >= 44)).toBe(true);
          await actions.last().scrollIntoViewIfNeeded();
          await expect(actions.last()).toBeInViewport();
          await page.screenshot({
            path: `e2e/artifacts/error-pages/${code}-${viewport.width}-${dark ? 'dark' : 'light'}.png`,
            animations: 'disabled',
          });
        });
      }
    });
  }
}
