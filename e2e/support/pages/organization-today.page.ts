import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationTodayPage
 *
 * @description
 * Wraps the organization landing route (`/organizations/:organizationId`)
 * behind named locators and one method per user intent: the KPI row, the
 * alert strip, the four named work queues, and the "Recently updated"
 * interventions card.
 */
export class OrganizationTodayPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-today');
  public readonly newInterventionButton: Locator = this.page.getByRole('button', {
    name: 'New intervention',
  });
  public readonly kpiSection: Locator = this.page.getByTestId('org-today-kpis');
  public readonly alertsSection: Locator = this.page.getByTestId('org-today-alerts');
  public readonly allClearState: Locator = this.page.getByText('Nothing is blocking');
  public readonly errorState: Locator = this.page.getByText("Couldn't load your work queues");
  public readonly recentInterventionsCard: Locator = this.page.getByTestId(
    'org-today-recent-interventions',
  );
  public readonly recentInterventionRows: Locator = this.page.getByTestId(
    'org-today-recent-intervention',
  );
  public readonly syncIndicatorTrigger: Locator = this.page.getByTestId('intervention-sync-status');
  public readonly syncIndicatorLastSynced: Locator = this.page.getByTestId(
    'intervention-sync-last-synced',
  );

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}`);
  }

  /** Opens the shell header's permanent sync indicator popover. */
  public async openSyncIndicator(): Promise<void> {
    await this.syncIndicatorTrigger.click();
  }

  /** Locates one KPI tile's wrapper by its stable id (`open-interventions`, `open-non-conformities`, `inspections-completed`, `equipment-under-maintenance`). */
  public kpiTile(id: string): Locator {
    return this.page.getByTestId(`org-today-kpi-${id}`);
  }

  /** Locates one alert row by its backend-defined code. */
  public alertRow(code: string): Locator {
    return this.page.getByTestId(`org-today-alert-${code}`);
  }

  /** Locates one named queue's wrapper (`overdue`, `changes-requested`, `awaiting-review`, `unsynced`). */
  public queue(id: string): Locator {
    return this.page.getByTestId(`org-today-queue-${id}`);
  }

  /** The whole-row link of one deep-linked queue (`overdue`, `changes-requested`, `awaiting-review`) — there is no per-intervention preview for these. */
  public queueRowLink(id: string): Locator {
    return this.queue(id).getByRole('link');
  }

  /** Opens one deep-linked queue's whole-row link, navigating to the filtered interventions list. */
  public async openQueueRow(id: string): Promise<void> {
    await this.queueRowLink(id).click();
  }

  /** Opens one "Recently updated" row by its intervention name. */
  public async openRecentIntervention(interventionName: string): Promise<void> {
    await this.recentInterventionsCard
      .getByRole('link', { name: new RegExp(interventionName) })
      .click();
  }

  /** Retries the work queues after their error state renders. */
  public async retryQueues(): Promise<void> {
    await this.page.getByRole('button', { name: 'Retry' }).click();
  }
}
