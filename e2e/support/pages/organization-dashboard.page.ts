import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationDashboardPage
 *
 * @description
 * Wraps the organization landing route (`/organizations/:organizationId`),
 * merging the retired Today and Statistics page objects behind one
 * continuous page: a single deduplicated KPI row, the alert strip, work
 * queues and "Recently updated" interventions, then a Trends section with
 * its own period preset toggle, compare switch, severity breakdown and
 * trend chart cards.
 */
export class OrganizationDashboardPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-dashboard');
  public readonly pageTitle: Locator = this.page
    .locator('#dashboard-page-header')
    .getByRole('heading', { level: 1 });
  public readonly newInterventionButton: Locator = this.page.getByRole('button', {
    name: 'New intervention',
  });

  public readonly kpiSection: Locator = this.page.getByTestId('org-dashboard-kpis');
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

  public readonly periodToggle: Locator = this.page.getByTestId('org-statistics-period-toggle');
  public readonly compareSwitch: Locator = this.page
    .getByTestId('org-statistics-compare-toggle')
    .getByRole('switch');
  public readonly severityRows: Locator = this.page.locator(
    '[data-testid^="org-statistics-severity-"]',
  );

  public readonly inspectionsChartCard: Locator = this.page.getByTestId(
    'org-statistics-chart-inspections',
  );
  public readonly nonConformitiesChartCard: Locator = this.page.getByTestId(
    'org-statistics-chart-non-conformities',
  );
  public readonly equipmentChartCard: Locator = this.page.getByTestId(
    'org-statistics-chart-equipment',
  );
  public readonly facilitiesChartCard: Locator = this.page.getByTestId(
    'org-statistics-chart-facilities',
  );

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}`);
  }

  /** Opens the shell header's permanent sync indicator popover. */
  public async openSyncIndicator(): Promise<void> {
    await this.syncIndicatorTrigger.click();
  }

  /** Locates one KPI tile's wrapper by its stable id (`open-interventions`, `open-non-conformities`, `inspections-completed`, `equipment-under-maintenance`, `facilities`, `equipment`, `resolution-rate`). */
  public kpiTile(id: string): Locator {
    return this.page.getByTestId(`org-dashboard-kpi-${id}`);
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

  /** Locates one severity breakdown row by its severity value (`critical`, `high`, `medium`, `low`). */
  public severityRow(severity: string): Locator {
    return this.page.getByTestId(`org-statistics-severity-${severity}`);
  }

  /** Selects one period preset (`7D`, `30D`, `90D`, `12M`) from the toggle group. */
  public async selectPeriod(preset: '7D' | '30D' | '90D' | '12M'): Promise<void> {
    await this.periodToggle.getByRole('button', { name: preset, exact: true }).click();
  }

  /** Toggles the compare-to-previous-period switch. */
  public async toggleCompare(): Promise<void> {
    await this.compareSwitch.click();
  }

  /** The rendered Chart.js `<canvas>` inside one trend chart card — the proof the chart actually mounted, since Chart.js paints to a canvas surface with no inspectable series markup. */
  public chartCanvas(card: Locator): Locator {
    return card.getByTestId('line-chart-canvas');
  }
}
