import type { Locator, Page } from '@playwright/test';

/** Maintenance requests expose description, qualification and explicit work conversion separately. */
export class ServiceRequestsPage {
  public constructor(private readonly page: Page) {}

  public readonly list: Locator = this.page.locator('#service-requests');
  public readonly detail: Locator = this.page.locator('#service-request-detail');
  public readonly newRequest: Locator = this.page.getByTestId('service-request-new');
  public readonly editor: Locator = this.page.getByTestId('service-request-editor');
  public readonly form: Locator = this.editor.getByTestId('service-request-form');
  public readonly actions: Locator = this.editor.getByTestId('service-request-action-form');
  public readonly site: Locator = this.editor.locator('#service-request-site');
  public readonly title: Locator = this.editor.locator('#service-request-title');
  public readonly description: Locator = this.editor.locator('#service-request-description');
  public readonly qualify: Locator = this.page.getByTestId('service-request-qualify');
  public readonly qualificationEquipment: Locator = this.editor.locator(
    '#service-request-qualification-equipment',
  );
  public readonly qualificationNote: Locator = this.editor.locator(
    '#service-request-qualification-note',
  );
  public readonly convert: Locator = this.page.getByTestId('service-request-convert');
  public readonly work: Locator = this.editor.locator('#service-request-existing-work');
  public readonly retryConversion: Locator = this.editor.getByRole('button', {
    name: 'Retry the same conversion',
    exact: true,
  });
  public readonly correctiveLink: Locator = this.detail.getByRole('link', {
    name: 'Open corrective intervention',
    exact: true,
  });

  public async goto(organizationId: string, requestId?: string): Promise<void> {
    await this.page.goto(
      `/organizations/${organizationId}/service-requests${requestId ? '/' + requestId : ''}`,
    );
  }

  public async prepareSiteRequest(
    siteName: string,
    title: string,
    description: string,
  ): Promise<void> {
    await this.newRequest.click();
    await this.site.click();
    await this.site.fill(siteName);
    await this.page.getByRole('option', { name: new RegExp('^' + siteName) }).click();
    await this.title.fill(title);
    await this.description.fill(description);
  }

  public async submitRequest(): Promise<void> {
    await this.form
      .getByRole('button', { name: 'Submit maintenance request', exact: true })
      .click();
  }

  public async prepareSiteQualification(equipmentLabel: string, note: string): Promise<void> {
    await this.qualify.click();
    await this.qualificationEquipment.click();
    await this.qualificationEquipment.fill(equipmentLabel);
    await this.page.getByRole('option', { name: new RegExp(equipmentLabel) }).click();
    await this.qualificationNote.fill(note);
  }

  public async confirmQualification(): Promise<void> {
    await this.actions.getByRole('button', { name: 'Confirm qualification', exact: true }).click();
  }

  public async prepareConversion(existingWorkName?: string): Promise<void> {
    await this.convert.click();
    if (existingWorkName) {
      await this.work.click();
      await this.work.fill(existingWorkName);
      await this.page.getByRole('option', { name: existingWorkName, exact: true }).click();
    }
  }

  public async confirmConversion(existing = false): Promise<void> {
    await this.actions
      .getByRole('button', {
        name: existing ? 'Link this corrective work' : 'Create corrective intervention',
        exact: true,
      })
      .click();
  }
}
