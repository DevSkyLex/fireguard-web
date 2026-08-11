import type { Locator, Page } from '@playwright/test';

/**
 * Page object EquipmentsPage
 *
 * @description
 * Wraps the equipment list, create and detail routes
 * (`/organizations/:organizationId/equipments*`) behind named locators and
 * one method per user intent.
 */
export class EquipmentsPage {
  public constructor(private readonly page: Page) {}

  public readonly listRoot: Locator = this.page.locator('#equipments');
  public readonly createRoot: Locator = this.page.locator('#equipment-create');
  public readonly detailRoot: Locator = this.page.locator('#equipment-detail');

  public readonly search: Locator = this.page.getByTestId('equipments-search');
  public readonly filtersTrigger: Locator = this.page.getByTestId('equipments-filters-trigger');
  public readonly typeFilter: Locator = this.page.getByTestId('equipments-filter-type');
  public readonly statusFilter: Locator = this.page.getByTestId('equipments-filter-status');
  public readonly newLink: Locator = this.page.getByTestId('equipments-new');
  public readonly rowCount: Locator = this.page.getByTestId('equipments-row-count');
  public readonly pageIndicator: Locator = this.page.getByTestId('equipments-page-indicator');
  public readonly table: Locator = this.page.getByTestId('equipment-table');
  public readonly tableRows: Locator = this.page.getByTestId('equipment-table-row');

  public readonly createTypeSelect: Locator = this.page.getByTestId('equipment-create-type');
  public readonly createError: Locator = this.page.getByTestId('equipment-create-error');
  public readonly createSubmit: Locator = this.page.getByTestId('equipment-create-submit');

  public readonly detailLoading: Locator = this.page.getByTestId('equipment-detail-loading');
  public readonly lifecycleBand: Locator = this.page.getByTestId('equipment-lifecycle-band');
  public readonly primaryAction: Locator = this.page.getByTestId('equipment-primary-action');
  public readonly decommissionAction: Locator = this.page.getByTestId('equipment-decommission');
  public readonly brandField: Locator = this.page.getByTestId('equipment-field-brand');

  public async gotoList(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/equipments`);
  }

  public async gotoCreate(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/equipments/create`);
  }

  public async gotoDetail(organizationId: string, equipmentId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/equipments/${equipmentId}`);
  }

  /** Submits the create form empty, so only the required `type` rule fires. */
  public async submitEmptyCreateForm(): Promise<void> {
    await this.createSubmit.click();
  }
}
