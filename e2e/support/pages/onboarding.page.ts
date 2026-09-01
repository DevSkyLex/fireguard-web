import type { Locator, Page } from '@playwright/test';

/**
 * Page object OnboardingPage
 *
 * @description
 * Wraps the mandatory activation wizard (`/onboarding`) behind named
 * locators — the split shell, its branded showcase panel, the
 * `create_organization` first-step form, and the later steps' forms
 * (facilities, equipment) plus the shared "Skip for now" action.
 */
export class OnboardingPage {
  public constructor(private readonly page: Page) {}

  public readonly shellRoot: Locator = this.page.locator('#split-layout');
  public readonly showcasePanel: Locator = this.page.locator('#split-layout-showcase');
  public readonly content: Locator = this.page.locator('#split-layout-content');

  public readonly orgNameInput: Locator = this.page.getByTestId('onboarding-org-name');
  public readonly orgSlugInput: Locator = this.page.getByTestId('onboarding-org-slug');
  public readonly orgSubmit: Locator = this.page.getByTestId('onboarding-org-submit');
  public readonly orgError: Locator = this.page.getByTestId('onboarding-org-error');

  public readonly skipButton: Locator = this.page.getByTestId('onboarding-wizard-skip');
  public readonly blockedBanner: Locator = this.page.getByTestId('onboarding-wizard-blocked');
  public readonly loadingIndicator: Locator = this.page.getByTestId('onboarding-wizard-loading');

  public readonly facilityTypeTrigger: Locator = this.page.getByTestId('onboarding-facility-type');
  public readonly facilityNameInput: Locator = this.page.getByTestId('onboarding-facility-name');
  public readonly facilityAddressInput: Locator = this.page.getByTestId(
    'onboarding-facility-address',
  );
  public readonly facilityAddButton: Locator = this.page.getByTestId('onboarding-facility-add');
  public readonly facilitiesStaged: Locator = this.page.getByTestId('onboarding-facilities-staged');
  public readonly facilitiesSubmit: Locator = this.page.getByTestId('onboarding-facilities-submit');

  public readonly equipmentTypeTrigger: Locator = this.page.getByTestId(
    'onboarding-equipment-type',
  );
  public readonly equipmentBrandInput: Locator = this.page.getByTestId(
    'onboarding-equipment-brand',
  );
  public readonly equipmentModelInput: Locator = this.page.getByTestId(
    'onboarding-equipment-model',
  );
  public readonly equipmentSerialInput: Locator = this.page.getByTestId(
    'onboarding-equipment-serial',
  );
  public readonly equipmentSubmit: Locator = this.page.getByTestId('onboarding-equipment-submit');

  public async goto(): Promise<void> {
    await this.page.goto('/onboarding');
  }

  /** Picks a facility type option from the `hlm-select` trigger by its visible label. */
  public async pickFacilityType(label: string): Promise<void> {
    await this.facilityTypeTrigger.click();
    await this.page.getByRole('option', { name: label }).click();
  }

  /** Picks an equipment type option from the `hlm-select` trigger by its visible label. */
  public async pickEquipmentType(label: string): Promise<void> {
    await this.equipmentTypeTrigger.click();
    await this.page.getByRole('option', { name: label }).click();
  }

  /** Fills the facility draft and stages it with "Add facility" — the explicit step every fix-#227 wizard walk requires. */
  public async addFacility(values: {
    readonly type: string;
    readonly name: string;
  }): Promise<void> {
    await this.pickFacilityType(values.type);
    await this.facilityNameInput.fill(values.name);
    await this.facilityAddButton.click();
  }
}
