import type { Locator, Page } from '@playwright/test';

/** The operation library exposes explicit calendar preparation, date preview and activation. */
export class MaintenancePlansPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#maintenance-plans');
  public readonly newPlan: Locator = this.page.getByRole('button', {
    name: 'Prepare an operation plan',
    exact: true,
  });
  public readonly form: Locator = this.page.locator('#maintenance-plan-form');
  public readonly equipment: Locator = this.page.locator('#maintenance-plan-equipment');
  public readonly name: Locator = this.page.locator('#maintenance-plan-name');
  public readonly operation: Locator = this.page.locator('#maintenance-plan-kind');
  public readonly every: Locator = this.page.locator('#maintenance-plan-every');
  public readonly unit: Locator = this.page.locator('#maintenance-plan-unit');
  public readonly anchor: Locator = this.page.locator('#maintenance-plan-anchor');
  public readonly firstDue: Locator = this.page.locator('#maintenance-plan-first-due');
  public readonly save: Locator = this.page.getByTestId('maintenance-plan-save');
  public readonly preview: Locator = this.page.getByTestId('maintenance-plan-preview');
  public readonly activate: Locator = this.page.getByTestId('maintenance-plan-activate');
  public readonly pause: Locator = this.preview.getByRole('button', {
    name: 'Pause this operation',
    exact: true,
  });
  public readonly controls: Locator = this.page.getByRole('tab', { name: 'Controls', exact: true });
  public readonly maintenance: Locator = this.page.getByRole('tab', {
    name: 'Maintenance',
    exact: true,
  });

  public async goto(
    organizationId: string,
    kind: 'control' | 'maintenance' = 'control',
  ): Promise<void> {
    await this.page.goto(
      `/organizations/${organizationId}/maintenance/plans?operationKind=${kind}`,
    );
  }

  public row(planId: string): Locator {
    return this.page.getByTestId(`maintenance-plan-${planId}`);
  }

  public async prepareMonthlyMaintenance(name: string, equipmentName: string): Promise<void> {
    await this.newPlan.click();
    await this.equipment.fill(equipmentName);
    await this.page.getByRole('option', { name: equipmentName, exact: true }).click();
    await this.name.fill(name);
    await this.operation.click();
    await this.page.getByRole('option', { name: 'Maintenance', exact: true }).click();
    await this.every.fill('1');
    await this.unit.click();
    await this.page.getByRole('option', { name: 'Months', exact: true }).click();
    await this.anchor.fill('2027-01-31');
    await this.firstDue.fill('2027-02-28');
    await this.save.click();
  }
}
