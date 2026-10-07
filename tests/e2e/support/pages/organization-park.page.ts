import { expect, type Locator, type Page } from '@playwright/test';

/** Scoped actions for the park filters, dashboard queues and source-inspection navigation. */
export class OrganizationParkPage {
  public constructor(
    private readonly page: Page,
    private readonly touch = false,
  ) {}

  public readonly queues: Locator = this.page.getByTestId('park-action-queues');
  public readonly park: Locator = this.page.locator('#organization-assets');
  public readonly customerInput: Locator = this.page.locator('#dashboard-park-customer');
  public readonly siteInput: Locator = this.page.locator('#dashboard-park-site');
  public readonly anomalyPane: Locator = this.page.getByTestId('park-anomalies-pane');
  public readonly equipmentPane: Locator = this.page.getByTestId('assets-equipment-pane');
  public readonly equipmentLinks: Locator = this.equipmentPane.locator('a[href*="/equipments/"]');

  public async gotoDashboard(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}`);
    await expect(this.queues).toBeVisible();
  }

  public queue(name: string): Locator {
    return this.queues
      .locator('app-stat-tile')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  public async selectCustomer(name: string): Promise<void> {
    await this.activate(this.customerInput);
    await this.customerInput.fill(name);
    await this.activate(this.page.getByRole('option', { name, exact: false }));
  }

  public async selectSite(name: string): Promise<void> {
    await this.activate(this.siteInput);
    await this.siteInput.fill(name);
    await this.activate(this.page.getByRole('option', { name: new RegExp(name, 'u') }));
  }

  public async showAllEquipment(): Promise<void> {
    await this.activate(this.queues.getByRole('button', { name: 'All equipment', exact: true }));
  }

  public async openQueue(name: string): Promise<void> {
    await this.activate(this.queue(name).getByRole('link'));
  }

  public async openAnomalies(): Promise<void> {
    await this.openQueue('Anomalies to address');
    await expect(this.anomalyPane).toBeVisible();
  }

  public async openSourceInspection(description: string): Promise<void> {
    await this.activate(
      this.anomalyPane.getByRole('link', {
        name: new RegExp(`Open source inspection for ${description}`, 'u'),
      }),
    );
  }

  private async activate(target: Locator): Promise<void> {
    if (this.touch) await target.tap();
    else await target.click();
  }
}
