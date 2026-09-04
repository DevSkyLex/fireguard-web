import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  E2E_ORGANIZATION_ID,
  inProgressOnboardingOutput,
  type OnboardingStepKeyFixture,
} from '../support/fixtures/api-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';
import { OnboardingPage } from '../support/pages/onboarding.page';

const CAPTURES = 'test-results/uiux-final-20260903';

for (const mode of [
  { name: 'desktop-light', width: 1440, height: 1000, dark: false },
  { name: 'desktop-dark', width: 1440, height: 1000, dark: true },
  { name: 'mobile-light', width: 375, height: 800, dark: false },
  { name: 'mobile-dark', width: 375, height: 800, dark: true },
]) {
  test(`keeps authentication and resumed activation immediately usable in ${mode.name}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await mkdir(CAPTURES, { recursive: true });
    const pathPrefix = new URL(baseURL ?? 'http://localhost:4273').pathname.replace(/\/$/, '');
    const locale = process.env['UIUX_TEST_LOCALE'] ?? 'en';
    const captureName = `${locale}-${mode.name}`;
    await page.setViewportSize({ width: mode.width, height: mode.height });
    if (mode.dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const auth = new AuthPages(page);
    const onboarding = new OnboardingPage(page);
    await page.goto(`${pathPrefix}/auth/login`);
    await expect(page.locator('html')).toHaveAttribute('lang', new RegExp(`^${locale}(?:-|$)`));
    await expect(auth.loginEmail).toBeInViewport();
    await expect(auth.loginSubmit).toBeInViewport();
    await expectNoHorizontalOverflow(page);
    if (mode.width === 375) {
      expect((await auth.loginEmail.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      expect((await auth.loginPassword.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: `${CAPTURES}/login-${captureName}.png` });
    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const canvasContext = canvas.getContext('2d');
      if (!canvasContext) throw new Error('Canvas is required to resolve CSS colors');
      const luminance = (token: string): number => {
        canvasContext.clearRect(0, 0, 1, 1);
        canvasContext.fillStyle = root.getPropertyValue(token).trim();
        canvasContext.fillRect(0, 0, 1, 1);
        const rgb = Array.from(canvasContext.getImageData(0, 0, 1, 1).data).slice(0, 3);
        const linear = rgb.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      };
      const ratio = (a: string, b: string): number => {
        const values = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      return {
        text: ratio('--foreground', '--background'),
        secondaryText: ratio('--muted-foreground', '--background'),
        primaryButton: ratio('--primary-foreground', '--primary'),
        nativeFocusRing: ratio('--ring', '--background'),
      };
    });
    expect(colors.text).toBeGreaterThanOrEqual(4.5);
    expect(colors.secondaryText).toBeGreaterThanOrEqual(4.5);
    expect(colors.primaryButton).toBeGreaterThanOrEqual(4.5);
    await page.goto(`${pathPrefix}/auth/register`);
    await expect(auth.registerFirstName).toBeInViewport();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${CAPTURES}/register-${captureName}.png` });

    await api.mockAuthenticatedSession();
    const order: readonly OnboardingStepKeyFixture[] = [
      'create_organization',
      'select_plan',
      'invite_members',
      'create_first_facility',
      'create_first_equipment',
    ];
    const measurements: {
      scene: string;
      fieldTop: number | undefined;
      fieldHeight: number | undefined;
    }[] = [];
    for (const scene of [
      {
        key: 'create_organization' as const,
        name: 'onboarding-org',
        field: onboarding.orgNameInput,
      },
      {
        key: 'create_first_facility' as const,
        name: 'onboarding-facility',
        field: onboarding.facilityNameInput,
      },
      {
        key: 'create_first_equipment' as const,
        name: 'onboarding-equipment',
        field: onboarding.equipmentTypeTrigger,
      },
    ]) {
      // Each scene navigates the same page and replaces its API mocks.
      // eslint-disable-next-line no-await-in-loop
      await test.step(scene.name, async () => {
        const record = inProgressOnboardingOutput();
        const completedSteps = order.slice(0, order.indexOf(scene.key));
        await api.mockOnboarding(
          inProgressOnboardingOutput({
            nextStep: scene.key,
            completedSteps,
            targetOrganizationId: scene.key === 'create_organization' ? null : E2E_ORGANIZATION_ID,
            steps: record.steps.map((step) =>
              Object.assign({}, step, {
                status: completedSteps.includes(step.key) ? 'completed' : 'pending',
              }),
            ),
          }),
        );
        await api.mockFacilityList(E2E_ORGANIZATION_ID, [
          facilityOutput({ name: 'Main warehouse', type: 'site' }),
        ]);
        await page.goto(`${pathPrefix}/onboarding`);
        await expect(scene.field).toBeInViewport();
        await expectNoHorizontalOverflow(page);
        const box = await scene.field.boundingBox();
        if (mode.width === 375) {
          expect(box?.y).toBeLessThan(400);
          expect(box?.height).toBeGreaterThanOrEqual(44);
        }
        if (scene.key === 'create_first_equipment') {
          await expect(page.getByTestId('onboarding-equipment-facility-summary')).toContainText(
            'Main warehouse',
          );
        }
        measurements.push({ scene: scene.name, fieldTop: box?.y, fieldHeight: box?.height });
        await page.screenshot({ path: `${CAPTURES}/${scene.name}-${captureName}.png` });
        if (scene.key === 'create_first_equipment' && mode.width === 375) {
          await onboarding.equipmentModelInput.focus();
          await page.keyboard.press('Tab');
          await expect(onboarding.equipmentSerialInput).toBeFocused();
          await expect
            .poll(async () => {
              const serial = await onboarding.equipmentSerialInput.boundingBox();
              const footer = await page.locator('app-onboarding-step-footer').boundingBox();
              return serial && footer ? serial.y + serial.height <= footer.y : false;
            })
            .toBe(true);
          await onboarding.content.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
          });
          const serial = await onboarding.equipmentSerialInput.boundingBox();
          const footer = await page.locator('app-onboarding-step-footer').boundingBox();
          if (!serial || !footer) throw new Error('Serial input and step footer must be rendered');
          expect(serial.y + serial.height).toBeLessThanOrEqual(footer.y);
        }
      });
    }
    await writeFile(
      `${CAPTURES}/auth-onboarding-${captureName}-measurements.json`,
      JSON.stringify({ colors, measurements }, null, 2),
    );
  });
}
