import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationDashboardPage
 *
 * @description
 * Wraps the organization landing route (`/organizations/:organizationId`),
 * with compact operational metrics and native Spartan charts.
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

  /** The native SVG plot inside a trend card. */
  public chartSvg(card: Locator): Locator {
    return card.getByTestId('line-chart').locator('svg').first();
  }
}
