import type { Locator, Page } from '@playwright/test';

/**
 * Page object InspectionsPage
 *
 * @description
 * Wraps the inspection list, create and detail routes
 * (`/organizations/:organizationId/inspections*`) behind named locators and
 * one method per user intent.
 */
export class InspectionsPage {
  public constructor(private readonly page: Page) {}

  public readonly listRoot: Locator = this.page.locator('#inspections');
  public readonly createRoot: Locator = this.page.locator('#inspection-create');
  public readonly detailRoot: Locator = this.page.locator('#inspection-detail');

  public readonly filtersToggle: Locator = this.page.getByTestId('inspections-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('inspections-filters-add');
  public readonly clearFiltersButton: Locator = this.page.getByTestId('inspections-clear-filters');
  public readonly statusFilter: Locator = this.page.getByTestId('inspections-filter-status');
  public readonly resultFilter: Locator = this.page.getByTestId('inspections-filter-result');
  public readonly newLink: Locator = this.page.getByTestId('inspections-new');
  public readonly rowCount: Locator = this.page.getByTestId('inspections-row-count');
  public readonly pageIndicator: Locator = this.page.getByTestId('inspections-page-indicator');
  public readonly tableRows: Locator = this.page.getByTestId('inspection-table-row');

  public readonly createEquipmentCombobox: Locator = this.page.getByTestId(
    'inspection-create-equipment',
  );
  public readonly createResultSelect: Locator = this.page.getByTestId('inspection-create-result');
  public readonly createInspectorName: Locator = this.page.getByTestId(
    'inspection-create-inspector-name',
  );
  public readonly createSubmit: Locator = this.page.getByTestId('inspection-create-submit');
  public readonly createError: Locator = this.page.getByTestId('inspection-create-error');

  public readonly detailLoading: Locator = this.page.getByTestId('inspection-detail-loading');
  public readonly lifecycleBand: Locator = this.page.getByTestId('inspection-lifecycle-band');
  public readonly submitAction: Locator = this.page.getByTestId('inspection-submit');
  public readonly cancelAction: Locator = this.page.getByTestId('inspection-cancel');
  public readonly closeAction: Locator = this.page.getByTestId('inspection-close');
  public readonly nonConformitiesCount: Locator = this.page.getByTestId(
    'inspection-non-conformities-count',
  );
  public readonly equipmentLink: Locator = this.page
    .getByTestId('inspection-field-equipment')
    .getByRole('link');
  public readonly facilityLink: Locator = this.page
    .getByTestId('inspection-field-facility')
    .getByRole('link');

  public async gotoList(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/inspections`);
  }

  public async gotoCreate(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/inspections/create`);
  }

  public async gotoDetail(organizationId: string, inspectionId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/inspections/${inspectionId}`);
  }

  public async gotoEdit(organizationId: string, inspectionId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/inspections/${inspectionId}/edit`);
  }

  /** Submits the create form empty, so every required field's rule fires at once. */
  public async submitEmptyCreateForm(): Promise<void> {
    await this.createSubmit.click();
  }

  /** Expands the filter bar via the toolbar's "Filters" toggle, when it is not already open. */
  public async openFilters(): Promise<void> {
    if ((await this.filtersToggle.getAttribute('aria-expanded')) === 'true') return;
    await this.filtersToggle.click();
  }

  /** Opens the "+ Filter" menu and picks the field named `fieldLabel`, e.g. `"Status"`. */
  public async addFilter(fieldLabel: string): Promise<void> {
    await this.addFilterTrigger.click();
    await this.page
      .getByTestId('inspections-filters-add-option')
      .filter({ hasText: fieldLabel })
      .click();
  }
}
