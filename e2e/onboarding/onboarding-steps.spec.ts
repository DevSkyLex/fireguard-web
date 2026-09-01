import { expect, test } from '@playwright/test';
import {
  E2E_ORGANIZATION_ID,
  onboardingOutput,
  onboardingStepOutput,
  type OnboardingOutputFixture,
  type OnboardingStepKeyFixture,
} from '../support/fixtures/api-fixtures';
import { equipmentOutput } from '../support/fixtures/equipment-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { OnboardingPage } from '../support/pages/onboarding.page';

/**
 * Builds an in-progress onboarding record sitting on `nextStep`, with every
 * step before it `completed` and every step after it `pending`. Mirrors the
 * shape the backend returns after `create_organization` — the organization
 * already exists, so `targetOrganizationId` is set from the very first fixture.
 */
function onboardingAt(
  nextStep: OnboardingStepKeyFixture | null,
  completedSteps: ReadonlyArray<OnboardingStepKeyFixture>,
): OnboardingOutputFixture {
  const order: ReadonlyArray<OnboardingStepKeyFixture> = [
    'create_organization',
    'select_plan',
    'invite_members',
    'create_first_facility',
    'create_first_equipment',
  ];

  return onboardingOutput({
    state: nextStep === null ? 'completed' : 'in_progress',
    nextStep,
    completedSteps,
    steps: order.map((key) =>
      onboardingStepOutput({
        key,
        status: completedSteps.includes(key) ? 'completed' : 'pending',
        required: key === 'create_organization',
        skippable: key !== 'create_organization',
        skipAvailable: key === nextStep && key !== 'create_organization',
      }),
    ),
    targetOrganizationId: E2E_ORGANIZATION_ID,
    targetOrganizationName: 'E2E Organization',
  });
}

test.describe('Onboarding wizard — steps 2 through 5', () => {
  test('skips plan and members, stages a facility explicitly, then registers equipment to complete the flow', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(onboardingAt('select_plan', ['create_organization']));
    await api.mockPlans([]);
    await api.mockBillingPricing([]);
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, []);

    const onboarding = new OnboardingPage(page);
    await onboarding.goto();

    // Step 2 — plan: skip.
    await expect(onboarding.skipButton).toBeVisible();
    await api.mockOnboardingStepSkip(
      'select_plan',
      onboardingAt('invite_members', ['create_organization', 'select_plan']),
    );
    await onboarding.skipButton.click();

    // Step 3 — members: skip.
    await expect(onboarding.skipButton).toBeVisible();
    await api.mockOnboardingStepSkip(
      'invite_members',
      onboardingAt('create_first_facility', [
        'create_organization',
        'select_plan',
        'invite_members',
      ]),
    );
    await onboarding.skipButton.click();

    // Step 4 — facility: stage one explicitly through "Add facility", then Continue.
    await expect(onboarding.facilityNameInput).toBeVisible();
    const createdFacility = facilityOutput({ type: 'site', name: 'Main warehouse' });
    await api.mockFacilityCreate(E2E_ORGANIZATION_ID, createdFacility);
    await api.mockOnboardingStepExecute(
      'create_first_facility',
      onboardingAt('create_first_equipment', [
        'create_organization',
        'select_plan',
        'invite_members',
        'create_first_facility',
      ]),
    );

    await onboarding.addFacility({ type: 'Site', name: 'Main warehouse' });
    await expect(onboarding.facilitiesStaged).toBeVisible();
    await expect(onboarding.facilitiesStaged).toContainText('Main warehouse');
    await onboarding.facilitiesSubmit.click();

    // Step 5 — equipment: fill and Continue, completing the wizard.
    await expect(onboarding.equipmentSerialInput).toBeVisible();
    const createdEquipment = equipmentOutput({ type: 'fire_extinguisher' });
    await api.mockEquipmentCreate(E2E_ORGANIZATION_ID, createdEquipment);
    await api.mockOnboardingStepExecute(
      'create_first_equipment',
      onboardingAt(null, [
        'create_organization',
        'select_plan',
        'invite_members',
        'create_first_facility',
        'create_first_equipment',
      ]),
    );

    await onboarding.pickEquipmentType('Fire extinguisher');
    await onboarding.equipmentSerialInput.fill('SN-E2E-001');
    await onboarding.equipmentSubmit.click();

    await expect(page).not.toHaveURL(/\/onboarding$/, { timeout: 10_000 });
  });
});
