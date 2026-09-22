import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const api = new ApiMock(page);
  await api.mockUnauthenticatedSession();
  await new AuthPages(page).gotoLogin();
  await expect(page.getByRole('button', { name: 'Appearance: Light', exact: true })).toBeVisible();
});

test('reveals both themes through native snapshots and preserves keyboard focus and form drafts', async ({
  page,
  context,
}, info) => {
  test.skip(
    !(await page.evaluate(() => typeof document.startViewTransition === 'function')),
    'This browser does not expose native view transitions; the immediate fallback is covered separately.',
  );
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  const root = page.locator('html');
  const auth = new AuthPages(page);
  await auth.loginEmail.fill('theme-preview@fireguard.test');
  await expect(root).not.toHaveAttribute('data-theme-transition');

  const revealTheme = async (mode: 'Dark' | 'Light'): Promise<void> => {
    const pausedReveal = await page.addStyleTag({
      content: `html[data-theme-transition='circle-blur']::view-transition-new(root) {
        animation-play-state: paused;
        animation-delay: -245ms;
      }`,
    });
    const trigger = page.getByRole('button', { name: /^Appearance:/ });
    await trigger.focus();
    await trigger.press('Enter');
    await page.getByRole('menuitem', { name: mode, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(root).toHaveAttribute('data-theme', mode.toLowerCase());
    await expect
      .poll(() =>
        page.evaluate(() =>
          document
            .getAnimations()
            .some(
              (animation) =>
                animation instanceof CSSAnimation &&
                animation.animationName === 'theme-circle-blur-reveal',
            ),
        ),
      )
      .toBe(true);

    const snapshots = await page.evaluate(() => {
      const oldView = getComputedStyle(document.documentElement, '::view-transition-old(root)');
      const newView = getComputedStyle(document.documentElement, '::view-transition-new(root)');
      return {
        oldAnimation: oldView.animationName,
        newClip: newView.clipPath,
        newBlur: newView.filter,
      };
    });
    expect(snapshots.oldAnimation).toBe('none');
    expect(snapshots.newClip).toMatch(/^circle\(/);
    expect(snapshots.newBlur).toMatch(/^blur\(/);
    await page.screenshot({
      path: `e2e/artifacts/theme-circle-blur/${info.project.name}/${mode.toLowerCase()}-reveal.png`,
    });

    await pausedReveal.evaluate((element) => element.parentNode?.removeChild(element));
    await expect(root).not.toHaveAttribute('data-theme-transition');
    await expect(trigger).toHaveAccessibleName(`Appearance: ${mode}`);
    await expect(trigger).toBeFocused();
    await expect(auth.loginEmail).toHaveValue('theme-preview@fireguard.test');
    expect(
      (await context.cookies()).find((cookie) => cookie.name === 'theme-preference')?.value,
    ).toBe(mode.toLowerCase());
    await page.screenshot({
      path: `e2e/artifacts/theme-circle-blur/${info.project.name}/${mode.toLowerCase()}-settled.png`,
    });
  };

  await revealTheme('Dark');
  await revealTheme('Light');

  await page.getByRole('button', { name: /^Appearance:/ }).click();
  await page.getByRole('menuitem', { name: 'System', exact: true }).click();
  await expect(root).not.toHaveAttribute('data-theme-transition');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(root).not.toHaveAttribute('data-theme-transition');
  await expect(page.getByRole('button', { name: 'Appearance: System', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const fallback of ['reduced motion', 'unsupported browser']) {
  test(`applies and retains the selected theme with ${fallback}`, async ({ page }) => {
    if (fallback === 'reduced motion') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    } else {
      await page.evaluate(() => {
        Object.defineProperty(document, 'startViewTransition', { value: undefined });
      });
    }

    await page.getByRole('button', { name: 'Appearance: Light', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Appearance: Dark', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition');
  });
}
