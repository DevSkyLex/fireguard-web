import type { Locator, Page } from '@playwright/test';

/**
 * Page object FacilitiesPage
 *
 * @description
 * Wraps the facility list, create and detail routes
 * (`/organizations/:organizationId/facilities*`) behind named locators and
 * one method per user intent.
 */
export class FacilitiesPage {
  public constructor(private readonly page: Page) {}

  public readonly listRoot: Locator = this.page.locator('#facilities');
  public readonly createRoot: Locator = this.page.locator('#facility-create');
  public readonly detailRoot: Locator = this.page.locator('#facility-detail');

  public readonly search: Locator = this.page.getByTestId('facilities-search');
  public readonly filtersTrigger: Locator = this.page.getByTestId('facilities-filters-trigger');
  public readonly archivedCheckbox: Locator = this.page.getByTestId('facilities-filter-archived');
  public readonly newLink: Locator = this.page.getByTestId('facilities-new');
  public readonly layoutToggle: Locator = this.page.getByTestId('facilities-layout-toggle');
  public readonly listViewToggle: Locator = this.page.getByTestId('facilities-layout-list');
  public readonly gridViewToggle: Locator = this.page.getByTestId('facilities-layout-grid');
  public readonly rowCount: Locator = this.page.getByTestId('facilities-row-count');
  public readonly pageIndicator: Locator = this.page.getByTestId('facilities-page-indicator');
  public readonly pageNext: Locator = this.page.getByTestId('facilities-page-next');
  public readonly tableRows: Locator = this.page.getByTestId('facility-table-row');
  public readonly rowMenu: Locator = this.page.getByTestId('facility-table-row-menu');

  public readonly createTypeSelect: Locator = this.page.getByTestId('facility-create-type');
  public readonly createName: Locator = this.page.getByTestId('facility-create-name');
  public readonly createLatitude: Locator = this.page.getByTestId('facility-create-latitude');
  public readonly createLongitude: Locator = this.page.getByTestId('facility-create-longitude');
  public readonly createSubmit: Locator = this.page.getByTestId('facility-create-submit');

  public readonly deleteAction: Locator = this.page.getByTestId('facility-detail-delete');
  public readonly overviewTab: Locator = this.page.getByTestId('facility-tab-overview');
  public readonly informationTab: Locator = this.page.getByTestId('facility-tab-information');
  public readonly hierarchyNodes: Locator = this.page.getByTestId('facility-hierarchy-node');
  public readonly nameField: Locator = this.page.getByTestId('facility-field-name');
  public readonly typeField: Locator = this.page.getByTestId('facility-field-type');
  public readonly parentField: Locator = this.page.getByTestId('facility-field-parent');

  public async gotoList(organizationId: string, query = ''): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities${query}`);
  }

  public async gotoCreate(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities/create`);
  }

  public async gotoDetail(organizationId: string, facilityId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities/${facilityId}`);
  }

  public async gotoEdit(organizationId: string, facilityId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities/${facilityId}/edit`);
  }

  /** Submits the create form empty, so only the required `type`/`name` rules fire. */
  public async submitEmptyCreateForm(): Promise<void> {
    await this.createSubmit.click();
  }
}
