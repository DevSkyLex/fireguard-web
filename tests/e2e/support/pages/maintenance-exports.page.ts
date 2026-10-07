import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from '../helpers/appearance';
import {
  EXPORT_BLOCKED_SOURCE_ID,
  EXPORT_SITE_NAME,
  EXPORT_SOURCE_ID,
  EXPORT_SYSTEM,
} from '../mocks/maintenance-export-api-mock';

/** Actual native sheets retain source selection, operation recovery and separate import acknowledgement. */
export class MaintenanceExportsPage {
  public constructor(private readonly page: Page) {}
  public readonly workspace: Locator = this.page.getByTestId('maintenance-exports-page');
  public readonly editor: Locator = this.page.getByTestId('maintenance-export-editor');
  public readonly detail: Locator = this.page.getByTestId('maintenance-export-detail');
  public readonly createForm: Locator = this.page.getByTestId('maintenance-export-create-form');
  public readonly referenceForm: Locator = this.page.getByTestId(
    'maintenance-export-reference-form',
  );
  public readonly actionForm: Locator = this.page.getByTestId('maintenance-export-action-form');
  public readonly recover: Locator = this.editor.getByRole('button', {
    name: 'Recover the same operation',
    exact: true,
  });

  public async goto(exportId?: string): Promise<void> {
    await this.page.goto(
      `/organizations/${E2E_ORGANIZATION_ID}/maintenance-exports${exportId ? '?exportId=' + exportId : ''}`,
    );
    await expect(this.workspace).toBeVisible();
  }

  public async prepareExport(): Promise<void> {
    await this.page.getByTestId('maintenance-export-create').click();
    const system = this.editor.getByLabel('External system code', { exact: true });
    await system.click();
    await system.fill(EXPORT_SYSTEM);
    await expect(this.editor.locator('#export-source-' + EXPORT_BLOCKED_SOURCE_ID)).toBeDisabled();
    await this.editor.locator('#export-source-' + EXPORT_SOURCE_ID).click();
  }

  public async generate(): Promise<void> {
    await this.createForm
      .getByRole('button', { name: 'Generate retained export', exact: true })
      .click();
  }

  public async download(format: 'JSON' | 'CSV'): Promise<Buffer> {
    const waiting = this.page.waitForEvent('download');
    await this.detail
      .getByRole('button', { name: 'Download retained ' + format, exact: true })
      .click();
    const download = await waiting;
    expect(await download.failure()).toBeNull();
    const file = await download.path();
    if (!file) throw new Error('The retained download must exist as actual browser bytes.');
    return readFile(file);
  }

  public async mapSite(reference: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Map a reference', exact: true }).click();
    const system = this.editor.getByLabel('External system code', { exact: true });
    await system.click();
    await system.fill(EXPORT_SYSTEM);
    await this.editor.getByRole('combobox', { name: 'Resource type', exact: true }).click();
    await this.page.getByRole('option', { name: 'Site', exact: true }).click();
    await this.editor.getByRole('combobox', { name: 'Scoped resource', exact: true }).click();
    await this.page.getByRole('option', { name: EXPORT_SITE_NAME, exact: true }).click();
    await this.editor.getByLabel('External resource reference', { exact: true }).fill(reference);
    await this.referenceForm
      .getByRole('button', { name: 'Save reviewed reference', exact: true })
      .click();
    await expect(this.editor).toBeHidden();
  }

  public async prepareAdjustment(reason: string): Promise<void> {
    await this.detail.getByRole('button', { name: 'Append adjustment', exact: true }).click();
    const input = this.editor.getByLabel('Reason for adjustment', { exact: true });
    await input.click();
    await input.fill(reason);
  }

  public async generateAdjustment(): Promise<void> {
    await this.actionForm.getByRole('button', { name: 'Generate adjustment', exact: true }).click();
    await expect(this.editor).toBeHidden();
  }

  public async prepareConfirmation(reference: string): Promise<void> {
    await this.detail.getByRole('button', { name: 'Confirm external import', exact: true }).click();
    const input = this.editor.getByLabel('Actual external import reference', { exact: true });
    await input.click();
    await input.fill(reference);
  }

  public async confirmImport(): Promise<void> {
    await this.actionForm
      .getByRole('button', { name: 'Confirm actual import', exact: true })
      .click();
    await expect(this.editor).toBeHidden();
  }

  public async capture(info: TestInfo, name: string): Promise<void> {
    const run = process.env['FG_VISUAL_RUN'] ?? 'review';
    if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('Invalid visual run name.');
    const directory = join(
      'tests/e2e/artifacts/maintenance-exports',
      run,
      info.project.name.replaceAll(' ', '-'),
    );
    await mkdir(directory, { recursive: true });
    await expect(this.page.locator('vite-error-overlay')).toHaveCount(0);
    await expectNoHorizontalOverflow(this.page);
    await expectNoInternalOverflow(this.workspace);
    if (await this.editor.isVisible()) await expectNoInternalOverflow(this.editor);
    const path = join(directory, name + '.png');
    await this.page.screenshot({ path, animations: 'disabled' });
    await info.attach(name, { path, contentType: 'image/png' });
  }
}
