import { expect, type Locator, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import {
  PROCUREMENT_PART_LABEL,
  PROCUREMENT_SUPPLIER_NAME,
  PROCUREMENT_WAREHOUSE_NAME,
} from '../helpers/procurement';

/** Native purchase sheets separate preparation, physical receipts and explicit reserve creation. */
export class ProcurementPage {
  public constructor(private readonly page: Page) {}

  public readonly workspace: Locator = this.page.locator('#procurement-workspace');
  public readonly editor: Locator = this.page.getByTestId('procurement-editor');
  public readonly confirmation: Locator = this.page.getByTestId('procurement-confirmation');
  public readonly detail: Locator = this.page.getByTestId('procurement-order-detail');
  public readonly receipts: Locator = this.page.getByTestId('procurement-receipts');
  public readonly retry: Locator = this.page.getByTestId('procurement-retry-operation');

  public async goto(): Promise<void> {
    await this.page.goto(`/organizations/${E2E_ORGANIZATION_ID}/procurement?section=suppliers`);
    await expect(this.workspace).toBeVisible();
  }

  public async createSupplier(): Promise<void> {
    await this.page.getByTestId('procurement-new-supplier').click();
    await this.editor.getByLabel('Name', { exact: true }).fill(PROCUREMENT_SUPPLIER_NAME);
    await this.editor.getByLabel('Internal reference', { exact: true }).fill('FIRE-PARTS');
    await this.editor.getByRole('button', { name: 'Create supplier', exact: true }).click();
    await expect(this.editor).toBeHidden();
  }

  public async prepareOrder(hardware = false): Promise<void> {
    await this.page.getByRole('tab', { name: 'Orders', exact: true }).click();
    await this.page.getByTestId('procurement-new-order').click();
    await this.editor
      .getByLabel('Order name', { exact: true })
      .fill(hardware ? 'Reserve extinguishers' : 'Extinguisher maintenance seals');
    await this.editor
      .getByLabel('Internal supplier', { exact: true })
      .fill(PROCUREMENT_SUPPLIER_NAME);
    await this.page.getByRole('option', { name: new RegExp(PROCUREMENT_SUPPLIER_NAME) }).click();
    if (hardware) {
      await this.editor.getByLabel('Item kind', { exact: true }).click();
      await this.page
        .getByRole('option', { name: 'Equipment to individualize', exact: true })
        .click();
      await this.editor.getByLabel('Equipment type', { exact: true }).click();
      await this.page.getByRole('option', { name: 'Fire extinguisher', exact: true }).click();
      await this.editor
        .getByLabel('Equipment name', { exact: true })
        .fill('Reserve CO2 extinguisher');
      await this.editor.getByLabel('Quantity', { exact: true }).fill('1');
    } else {
      await this.editor.getByLabel('Stock article', { exact: true }).fill('Extinguisher');
      await this.page.getByRole('option', { name: new RegExp(PROCUREMENT_PART_LABEL) }).click();
      await this.editor.getByLabel('Quantity', { exact: true }).fill('1.000002');
      await this.editor.getByLabel('Internal unit cost', { exact: true }).fill('3.000001');
    }
  }

  public async saveAndPlaceOrder(): Promise<void> {
    await this.editor.getByRole('button', { name: 'Save purchase draft', exact: true }).click();
    await expect(this.editor).toBeHidden();
    await this.detail.getByRole('button', { name: 'Place purchase order', exact: true }).click();
    await this.confirmOperation();
    await expect(this.confirmation).toBeHidden();
  }

  public async prepareReceipt(hardware = false): Promise<void> {
    await this.detail.getByRole('button', { name: 'Record a delivery', exact: true }).click();
    await this.editor.getByLabel('Quantity', { exact: true }).fill(hardware ? '1' : '0.500001');
    if (!hardware) {
      const warehouse = this.editor.getByLabel('Receiving warehouse', { exact: true });
      await warehouse.click();
      await warehouse.fill(PROCUREMENT_WAREHOUSE_NAME);
      const option = this.page.getByRole('option', {
        name: new RegExp(PROCUREMENT_WAREHOUSE_NAME),
      });
      await expect(option).toBeInViewport();
      await option.click();
    }
  }

  public async submitReceipt(): Promise<void> {
    await this.editor.getByRole('button', { name: 'Record physical receipt', exact: true }).click();
  }

  public async openReceipts(): Promise<void> {
    await this.detail.getByRole('button', { name: 'View receipts', exact: true }).click();
    await expect(this.receipts).toBeVisible();
  }

  public async prepareReturn(): Promise<void> {
    await this.receipts
      .getByRole('button', { name: 'Record a physical return', exact: true })
      .click();
    await this.editor.getByLabel('Quantity', { exact: true }).fill('0.250001');
    await this.editor
      .getByLabel('Physical return reason', { exact: true })
      .fill('Damaged valve seals physically returned to the supplier');
  }

  public async submitReturn(): Promise<void> {
    await this.editor.getByRole('button', { name: 'Record physical return', exact: true }).click();
    await expect(this.editor).toBeHidden();
  }

  public async showReturnHistory(): Promise<void> {
    await this.receipts.getByRole('button', { name: 'View return history', exact: true }).click();
  }

  public async confirmOperation(): Promise<void> {
    await this.confirmation.getByTestId('procurement-confirm-operation').click();
  }
}
