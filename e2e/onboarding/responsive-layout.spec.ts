import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  E2E_ORGANIZATION_ID,
  inProgressOnboardingOutput,
  type OnboardingStepKeyFixture,
} from '../support/fixtures/api-fixtures';
import { E2E_PLAN_PRICING, planOutput } from '../support/fixtures/billing-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import { organizationRoleOutput } from '../support/fixtures/role-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

const CAPTURES = 'e2e/artifacts/onboarding-annotations-20260907';
const STEPS: readonly OnboardingStepKeyFixture[] = [
  'create_organization',
  'select_plan',
  'invite_members',
  'create_first_facility',
  'create_first_equipment',
];
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
];

for (const viewport of VIEWPORTS) {
  for (const dark of [false, true]) {
    test(`keeps all onboarding steps readable at ${viewport.width}px in ${dark ? 'dark' : 'light'} mode`, async ({
      page,
      context,
      baseURL,
    }) => {
      await mkdir(CAPTURES, { recursive: true });
      await page.setViewportSize(viewport);
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockPlans([
        planOutput({
          id: 'free',
          key: 'free',
          name: 'Free',
          isDefault: true,
          description: 'For a small organization getting started.',
        }),
        planOutput({ description: 'Room to grow for active teams.' }),
      ]);
      await api.mockBillingPricing(E2E_PLAN_PRICING);
      await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [organizationRoleOutput()]);
      await api.mockFacilityList(E2E_ORGANIZATION_ID, [
        facilityOutput({ name: 'North logistics and maintenance center', type: 'site' }),
      ]);
      for (const key of STEPS) {
        // eslint-disable-next-line no-await-in-loop
        await test.step(key, async () => {
          const completedSteps = STEPS.slice(0, STEPS.indexOf(key));
          const record = inProgressOnboardingOutput();
          await api.mockOnboarding(
            inProgressOnboardingOutput({
              nextStep: key,
              completedSteps,
              targetOrganizationId: key === 'create_organization' ? null : E2E_ORGANIZATION_ID,
              steps: record.steps.map((step) =>
                Object.assign({}, step, {
                  status: completedSteps.includes(step.key) ? 'completed' : 'pending',
                  skippable: step.key === 'select_plan' || step.key === 'invite_members',
                  skipAvailable:
                    step.key === key && (key === 'select_plan' || key === 'invite_members'),
                }),
              ),
            }),
          );
          await page.goto('/onboarding/create');
          const form = page.locator('#onboarding-wizard-page form');
          await expect(form).toBeVisible();
          await expectNoHorizontalOverflow(page);
          const content = page.locator('#split-layout-content-box');
          const box = await content.boundingBox();
          expect(box?.width ?? Infinity).toBeLessThanOrEqual(576);
          const controls = form.locator(
            'input:not([type="hidden"]):not([type="radio"]):visible, button[role="combobox"]:visible',
          );
          if (await controls.count()) await expect(controls.first()).toBeInViewport();
          const rail = page.locator('#split-layout-showcase');
          if (viewport.width >= 1024) {
            await expect(rail).toBeVisible();
            await expect(rail.locator('#auth-showcase-preview')).toBeVisible();
            expect((await rail.boundingBox())?.width).toBeCloseTo(viewport.width / 2, 0);
          } else {
            await expect(rail).toBeHidden();
          }
          const toggle = page.getByTestId('onboarding-progress-toggle');
          await toggle.click();
          await expect(
            page.getByTestId('onboarding-wizard-step-rail').getByTestId('onboarding-step-label'),
          ).toHaveCount(5);
          await toggle.click();
          await expect(toggle).toBeFocused();
          await page.screenshot({
            path: `${CAPTURES}/${viewport.width}-${dark ? 'dark' : 'light'}-${key}.png`,
            animations: 'disabled',
          });
          if (viewport.width < 640) {
            const controlBoxes = await Promise.all(
              (await controls.all()).map((control) => control.boundingBox()),
            );
            for (const controlBox of controlBoxes)
              expect(controlBox?.height ?? 0).toBeGreaterThanOrEqual(44);
          }
          const submit = form.locator('button[type="submit"]');
          const formBox = await form.boundingBox();
          const submitBox = await submit.boundingBox();
          expect(submitBox?.width).toBeCloseTo(formBox?.width ?? 0, 0);
          if (key === 'select_plan') {
            const skipBox = await page.getByTestId('onboarding-wizard-skip').boundingBox();
            expect(skipBox?.height).toBe(submitBox?.height);
            expect(skipBox?.width).toBe(submitBox?.width);
            const quotas = page.getByTestId('onboarding-plan-card-free').locator('li');
            const quotaBoxes = await Promise.all(
              (await quotas.all()).map((quota) => quota.boundingBox()),
            );
            expect(new Set(quotaBoxes.map((quotaBox) => quotaBox?.x)).size).toBe(1);
            const cards = await page
              .getByTestId('onboarding-plan-group')
              .locator('label[data-testid]')
              .all();
            const boxes = await Promise.all(cards.map((card) => card.boundingBox()));
            for (let i = 1; i < boxes.length; i++) {
              expect(boxes[i]?.y ?? 0).toBeGreaterThanOrEqual(
                (boxes[i - 1]?.y ?? 0) + (boxes[i - 1]?.height ?? 0),
              );
            }
          }

          await submit.scrollIntoViewIfNeeded();
          await expect(submit).toBeInViewport();
          if (viewport.width < 640)
            expect((await submit.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
          if (key === 'select_plan') {
            const choices = page.getByTestId('onboarding-plan-group').locator('label[for]');
            const choiceBoxes = await Promise.all(
              (await choices.all()).map((choice) => choice.boundingBox()),
            );
            expect(new Set(choiceBoxes.map((choice) => choice?.width)).size).toBe(1);
            const free = page.getByRole('radio', { name: 'Free', exact: true });
            await free.focus();
            await page.keyboard.press('ArrowRight');
            await expect(page.getByRole('radio', { name: 'Pro', exact: true })).toBeChecked();
            await expect(submit).toHaveText('Continue to payment');
          }
          if (key === 'invite_members' && (viewport.width === 360 || viewport.width === 1440)) {
            await page
              .getByTestId('onboarding-member-email')
              .fill('regional.safety.coordinator.north@example.com');
            await page.getByTestId('onboarding-member-add').click();
            await expect(page.getByTestId('onboarding-members-staged')).toContainText(
              'regional.safety.coordinator.north@example.com',
            );
            await expectNoHorizontalOverflow(page);
            const staged = page.getByTestId('onboarding-members-staged');
            expect(
              await staged.evaluate((element) => element.scrollWidth - element.clientWidth),
            ).toBeLessThanOrEqual(1);
            await page.screenshot({
              path: `${CAPTURES}/${viewport.width}-${dark ? 'dark' : 'light'}-members-prepared.png`,
              animations: 'disabled',
            });
            await page
              .getByRole('button', {
                name: 'Edit regional.safety.coordinator.north@example.com',
                exact: true,
              })
              .click();
            await expect(page.getByTestId('onboarding-member-email')).toBeFocused();
          }
          if (await controls.count()) {
            const last = controls.last();
            await last.focus();
            await expect(last).toBeInViewport();
            const lastBox = await last.boundingBox();
            const footerBox = await form.locator('app-onboarding-step-footer').boundingBox();
            expect((lastBox?.y ?? Infinity) + (lastBox?.height ?? Infinity)).toBeLessThanOrEqual(
              (footerBox?.y ?? -Infinity) + 1,
            );
          }
        });
      }
    });
  }
}
