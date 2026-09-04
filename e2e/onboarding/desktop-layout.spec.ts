import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
import { AuthPages } from '../support/pages/auth.page';
import { OnboardingPage } from '../support/pages/onboarding.page';

const CAPTURES = 'test-results/uiux-desktop-review-20260903/auth-onboarding';
const PHASE = process.env['UIUX_CAPTURE_PHASE'] ?? 'after';
const ORDER: readonly OnboardingStepKeyFixture[] = [
  'create_organization',
  'select_plan',
  'invite_members',
  'create_first_facility',
  'create_first_equipment',
];

async function inspectLayout(page: Page, field: Locator) {
  await expect(field).toBeInViewport();
  await expectNoHorizontalOverflow(page);
  return page.evaluate(() => {
    const root = document.documentElement;
    const bounds = (selector: string) => {
      const element = root.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    };
    const rail = document.querySelector('app-onboarding-showcase');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      panel: bounds('#split-layout-showcase'),
      content: bounds('#split-layout-content-box'),
      heading: bounds('h1'),
      footer: bounds('app-onboarding-step-footer'),
      railPadding: rail ? getComputedStyle(rail).paddingLeft : null,
      planChoices: Array.from(
        document.querySelectorAll('[data-testid^="onboarding-plan-card-"]'),
      ).map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, right: rect.right };
      }),
      railLabels: Array.from(
        document.querySelectorAll('#split-layout-showcase ol li > div > p:first-child'),
      ).map((element) => ({
        label: element.textContent?.trim(),
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
      })),
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  for (const dark of [false, true]) {
    const mode = `${viewport.width}x${viewport.height}-${dark ? 'dark' : 'light'}`;
    test(`keeps all five activation steps and desktop authentication usable at ${mode}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await mkdir(CAPTURES, { recursive: true });
      await page.setViewportSize(viewport);
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      const auth = new AuthPages(page);
      const onboarding = new OnboardingPage(page);
      const measurements: unknown[] = [];
      const capture = async (scene: string, field: Locator) => {
        const layout = await inspectLayout(page, field);
        measurements.push({ scene, ...layout });
        await page.screenshot({
          path: `${CAPTURES}/${PHASE}-${mode}-${scene}.png`,
          animations: 'disabled',
        });
        return layout;
      };

      await api.mockUnauthenticatedSession();
      await auth.gotoLogin();
      await expect(auth.loginSubmit).toBeInViewport();
      await capture('login', auth.loginEmail);
      await auth.gotoRegister();
      await expect(auth.registerSubmit).toBeInViewport();
      await capture('register', auth.registerFirstName);

      await page.goto('/auth/password-reset/forgot');
      await capture('forgot-password', page.locator('input[type="email"]'));
      await expect(
        page.getByRole('button', { name: 'Send reset code', exact: true }),
      ).toBeInViewport();
      await page.goto('/auth/register/verify?token=e2e-desktop-challenge');
      await capture('email-verification', auth.otpSubmit);
      await expect(auth.otpResend).toBeInViewport();

      await api.mockAuthenticatedSession();
      await api.mockPlans([
        planOutput({
          id: 'free',
          key: 'free',
          name: 'Free',
          isDefault: true,
          description: 'For a small organization getting started.',
        }),
        planOutput(),
      ]);
      await api.mockBillingPricing(E2E_PLAN_PRICING);
      await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
        organizationRoleOutput(),
        organizationRoleOutput({ id: 'coordinator', name: 'Regional safety coordinator' }),
      ]);
      await api.mockFacilityList(E2E_ORGANIZATION_ID, [
        facilityOutput({ name: 'Main warehouse', type: 'site' }),
        facilityOutput({
          id: 'second-site',
          name: 'North logistics and maintenance center',
          type: 'site',
        }),
      ]);

      for (const key of ORDER) {
        // Each scene replaces the route fixture before navigating.
        // eslint-disable-next-line no-await-in-loop
        await test.step(key, async () => {
          const completedSteps = ORDER.slice(0, ORDER.indexOf(key));
          const record = inProgressOnboardingOutput();
          await api.mockOnboarding(
            inProgressOnboardingOutput({
              nextStep: key,
              completedSteps,
              targetOrganizationId: key === 'create_organization' ? null : E2E_ORGANIZATION_ID,
              steps: record.steps.map((step) =>
                Object.assign({}, step, {
                  status: completedSteps.includes(step.key) ? 'completed' : 'pending',
                }),
              ),
            }),
          );
          await onboarding.goto();
          const field = {
            create_organization: onboarding.orgNameInput,
            select_plan: page.getByTestId('onboarding-plan-group'),
            invite_members: onboarding.memberEmailInput,
            create_first_facility: onboarding.facilityNameInput,
            create_first_equipment: onboarding.equipmentTypeTrigger,
          }[key];
          await expect(page.locator('app-onboarding-step-footer')).toBeInViewport();
          const layout = await capture(key, field);
          if (PHASE !== 'before') {
            for (const label of layout.railLabels)
              expect(label.height).toBeLessThanOrEqual(label.lineHeight + 1);
          }

          if (key === 'select_plan') {
            if (PHASE !== 'before') {
              for (const choice of layout.planChoices)
                expect(choice.width).toBe(layout.content?.width);
            }
            await page.getByTestId('onboarding-plan-card-pro').click();
            await expect(onboarding.planSubmit).toHaveText('Continue to payment');
            await capture('plan-paid-selected', field);
          }
          if (key === 'invite_members') {
            await page.getByTestId('onboarding-member-role').click();
            await expect(
              page.getByRole('option', { name: 'Regional safety coordinator', exact: true }),
            ).toBeInViewport();
            await capture('members-role-open', field);
            await page
              .getByRole('option', { name: 'Regional safety coordinator', exact: true })
              .click();
            await expect(
              page.getByRole('option', { name: 'Regional safety coordinator', exact: true }),
            ).toHaveCount(0);
            await onboarding.memberEmailInput.fill('coordinator.north-region@example.com');
            await onboarding.memberAddButton.click();
            if (PHASE !== 'before')
              await expect(page.getByText('Enter an email address.', { exact: true })).toBeHidden();
            await expect(
              page.getByRole('button', {
                name: 'Edit coordinator.north-region@example.com',
                exact: true,
              }),
            ).toBeInViewport();
            const prepared = await capture('members-prepared', field);
            if (PHASE !== 'before') expect(prepared.heading?.y).toBe(layout.heading?.y);
          }
          if (key === 'create_first_facility') {
            await onboarding.facilityTypeTrigger.click();
            await expect(page.getByRole('option', { name: 'Site', exact: true })).toBeInViewport();
            await capture('facility-type-open', field);
            await page.getByRole('option', { name: 'Site', exact: true }).click();
            await expect(page.getByRole('option', { name: 'Site', exact: true })).toHaveCount(0);
            await onboarding.facilityNameInput.fill('North logistics and maintenance center');
            await onboarding.facilityAddButton.click();
            if (PHASE !== 'before')
              await expect(onboarding.facilityNameInput).not.toHaveAttribute(
                'aria-invalid',
                'true',
              );
            const prepared = await capture('facility-prepared', field);
            if (PHASE !== 'before') expect(prepared.heading?.y).toBe(layout.heading?.y);
            if (PHASE !== 'before')
              await expect(
                page.getByText('Facility type is required.', { exact: true }),
              ).toBeHidden();
          }
          if (key === 'create_first_equipment') {
            await onboarding.equipmentTypeTrigger.click();
            await expect(
              page.getByRole('option', { name: 'Fire extinguisher', exact: true }),
            ).toBeInViewport();
            await capture('equipment-type-open', field);
            await page.getByRole('option', { name: 'Fire extinguisher', exact: true }).click();
            await onboarding.equipmentFacilityTrigger.getByRole('combobox').fill('North');
            await expect(page.getByRole('option', { name: /North logistics/ })).toBeInViewport();
            await capture('equipment-facility-open', field);
            await page.getByRole('option', { name: /North logistics/ }).click();
            await onboarding.equipmentSerialInput.focus();
            await page.keyboard.press('Tab');
            await expect(onboarding.equipmentSubmit).toBeFocused();
          }
        });
      }
      await writeFile(
        `${CAPTURES}/${PHASE}-${mode}-measurements.json`,
        JSON.stringify(measurements, null, 2),
      );
    });
  }
}
