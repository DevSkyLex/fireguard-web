import { expect, test } from '@playwright/test';
import {
  E2E_ORGANIZATION_ID,
  inProgressOnboardingOutput,
  organizationOutput,
  type OnboardingStepKeyFixture,
} from '../support/fixtures/api-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import { workspaceOptions } from '../support/fixtures/workspace-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { OnboardingPage } from '../support/pages/onboarding.page';

const atStep = (nextStep: OnboardingStepKeyFixture) =>
  inProgressOnboardingOutput({
    nextStep,
    targetOrganizationId: E2E_ORGANIZATION_ID,
    steps: inProgressOnboardingOutput().steps.map((step) =>
      Object.assign({}, step, {
        skipAvailable: step.key === nextStep && step.skippable,
      }),
    ),
  });

test('resumes a created organization after a failed confirmation without creating it twice', async ({
  page,
}, testInfo) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOnboarding(inProgressOnboardingOutput());
  await api.mockOrganizationCreate(organizationOutput());
  await api.mockPlans([]);
  await api.mockBillingPricing([]);
  await api.mockWorkspaceOptions(() => workspaceOptions({ organizations: [] }));
  let creations = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/organizations')) creations++;
  });
  await page.route('**/api/onboarding/organization/steps/create_organization/execute', (route) =>
    route.fulfill({ status: 500, json: { detail: 'Confirmation temporarily unavailable.' } }),
  );
  const wizard = new OnboardingPage(page);
  await wizard.goto();
  await wizard.orgNameInput.fill('Recovery organization');
  await wizard.orgSubmit.focus();
  await wizard.orgSubmit.press('Enter');
  await expect(page.getByTestId('onboarding-setup-saved')).toBeVisible();
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Confirmation temporarily unavailable.' }),
  ).toBeVisible();
  const confirm = page.getByTestId('onboarding-setup-confirm');
  await expect(confirm)
    .toBeFocused()
    .catch(async (error: unknown) => {
      await testInfo.attach('failed-confirmation-focus', {
        body: JSON.stringify(
          await page.evaluate(() => ({
            active: document.activeElement?.outerHTML.slice(0, 1600),
            step: document.querySelector('[data-step-heading]')?.textContent,
            confirm: document.querySelector('[data-testid="onboarding-setup-confirm"]')?.outerHTML,
          })),
        ),
        contentType: 'application/json',
      });
      throw error;
    });
  await page.getByTestId('onboarding-choose-workspace').click();
  await expect(page).toHaveURL(/\/onboarding\/workspace(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Your workspace' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/onboarding\/create(?:\?.*)?$/);
  await expect(page.getByTestId('onboarding-setup-saved')).toBeVisible();
  await expect(wizard.orgNameInput).toHaveCount(0);
  await confirm.focus();
  await confirm.press('Enter');
  await expect(confirm).toBeEnabled();
  await expect(confirm).toBeFocused();
  expect(creations).toBe(1);
  await page.reload();
  await expect(page.getByTestId('onboarding-setup-saved')).toBeVisible();
  await expect(wizard.orgNameInput).toHaveCount(0);
  await api.mockOnboardingStepExecute('create_organization', atStep('select_plan'));
  await page.getByRole('button', { name: 'Continue setup', exact: true }).click();
  await expect(page.getByTestId('onboarding-catalog-empty')).toBeVisible();
  expect(creations).toBe(1);
  const heading = page.getByRole('heading', { name: /Step 2 of 5.*Choose a plan/ });
  await expect(heading).toBeFocused();
});

test('recognizes a committed creation when the response is lost and advances from its receipt', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOnboarding(inProgressOnboardingOutput());
  await api.mockPlans([]);
  await api.mockBillingPricing([]);
  await api.mockOnboardingStepExecute('create_organization', atStep('select_plan'));
  let creations = 0;
  await page.route('**/api/organizations', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    creations++;
    api.recordSetupCreation(route, E2E_ORGANIZATION_ID, E2E_ORGANIZATION_ID);
    await route.abort('failed');
  });
  const wizard = new OnboardingPage(page);
  await wizard.goto();
  await wizard.orgNameInput.fill('Lost response');
  await wizard.orgSubmit.click();
  await expect(page.getByTestId('onboarding-catalog-empty')).toBeVisible();
  expect(creations).toBe(1);
  await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
});

test('restores a partial facility batch after reload and retries only the remaining row', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOnboarding(atStep('create_first_facility'));
  await api.mockFacilityAddressSuggestions(E2E_ORGANIZATION_ID);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput({ name: 'HQ' })]);
  await api.mockOnboardingStepExecute('create_first_facility', atStep('create_first_equipment'));
  let annexUnavailable = true;
  const createdNames: string[] = [];
  const attemptedKeys: string[] = [];
  await page.route(`**/api/organizations/${E2E_ORGANIZATION_ID}/facilities`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const input = route.request().postDataJSON() as { name: string; onboardingItemKey: string };
    attemptedKeys.push(input.onboardingItemKey);
    if (input.name === 'Annex' && annexUnavailable) {
      await route.fulfill({ status: 500, json: { detail: 'Annex unavailable.' } });
      return;
    }
    createdNames.push(input.name);
    api.recordSetupCreation(route, `facility-${input.name}`);
    await route.fulfill({
      status: 201,
      json: facilityOutput({ id: `facility-${input.name}`, name: input.name }),
    });
  });
  const wizard = new OnboardingPage(page);
  await wizard.goto();
  await wizard.addFacility({ type: 'Site', name: 'HQ' });
  await wizard.addFacility({ type: 'Building', name: 'Annex' });
  await wizard.facilitiesSubmit.click();
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Annex unavailable.' }),
  ).toBeVisible();
  expect(createdNames).toEqual(['HQ']);
  await page.reload();
  await expect(wizard.facilitiesStaged).toContainText('HQ');
  await expect(wizard.facilitiesStaged).toContainText('Annex');
  annexUnavailable = false;
  await wizard.facilitiesSubmit.click();
  await expect(wizard.equipmentTypeTrigger).toBeVisible();
  expect(createdNames).toEqual(['HQ', 'Annex']);
  expect(attemptedKeys).toHaveLength(3);
  expect(attemptedKeys[2]).toBe(attemptedKeys[1]);
});

test('preserves the focused action after a failed skip and focuses the next heading on success', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOnboarding(atStep('invite_members'));
  await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, []);
  await page.route('**/api/onboarding/organization/steps/invite_members/skip', (route) =>
    route.fulfill({ status: 500, json: { detail: 'Skip unavailable.' } }),
  );
  const wizard = new OnboardingPage(page);
  await wizard.goto();
  await wizard.skipButton.focus();
  await wizard.skipButton.press('Enter');
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Skip unavailable.' }),
  ).toBeVisible();
  await expect(wizard.skipButton).toBeFocused();
  await api.mockOnboardingStepSkip('invite_members', atStep('create_first_facility'));
  await wizard.skipButton.click();
  await expect(wizard.facilityNameInput).toBeVisible();
  await expect(page.getByRole('heading', { name: /Step 4 of 5.*First facility/ })).toBeFocused();
  await page.screenshot({
    path: 'e2e/artifacts/corrections/focus-after-skip.png',
    animations: 'disabled',
  });
});
