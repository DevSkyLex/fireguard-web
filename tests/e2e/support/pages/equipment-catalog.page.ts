import type { Locator, Page } from '@playwright/test';

/** Catalogue management exposes stable native labels and one editor for create or update. */
export class EquipmentCatalogPage {
  public constructor(private readonly page: Page) {}

  public readonly title: Locator = this.page.getByRole('heading', {
    name: 'Equipment types',
    exact: true,
  });
  public readonly newType: Locator = this.page.getByRole('button', {
    name: 'New equipment type',
    exact: true,
  });
  public readonly code: Locator = this.page.locator('#equipment-type-code');
  public readonly name: Locator = this.page.locator('#equipment-type-label');
  public readonly editor: Locator = this.page.getByTestId('equipment-type-editor-sheet');
  public readonly active: Locator = this.page.getByRole('button', { name: 'Active', exact: true });
  public readonly archived: Locator = this.page.getByRole('button', {
    name: 'Archived',
    exact: true,
  });

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/equipments/types`);
  }

  public row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByText(code, { exact: true }) });
  }

  public async create(
    code: string,
    name: string,
    family: 'Fire' | 'Safety' | 'Other',
  ): Promise<void> {
    await this.newType.click();
    await this.code.fill(code);
    await this.name.fill(name);
    await this.editor.getByRole('button', { name: family, exact: true }).click();
    await this.editor.getByRole('button', { name: 'Create type', exact: true }).click();
  }

  public async edit(code: string): Promise<void> {
    await this.row(code).getByRole('button', { name: 'Edit', exact: true }).click();
  }
}
