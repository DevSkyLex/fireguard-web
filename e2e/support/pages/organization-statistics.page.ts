import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationStatisticsPage
 *
 * @description
 * Wraps the statistics route (`/organizations/:organizationId/statistics`)
 * behind named locators and one method per user intent: the period preset
 * toggle, the compare-to-previous-period switch, the KPI row, the severity
 * breakdown, and the four trend chart cards.
 */
export class OrganizationStatisticsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-statistics');
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
    await this.page.goto(`/organizations/${organizationId}/statistics`);
  }

  /** Locates one KPI tile's wrapper by its stable id (`facilities`, `equipment`, `inspections-completed`, `open-non-conformities`, `resolution-rate`). */
  public kpiTile(id: string): Locator {
    return this.page.getByTestId(`org-statistics-kpi-${id}`);
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

  /**
   * The rendered ngx-charts series paths inside one chart card — `g.line-series path.line`
   * for a line series, `g.area-series path.area` for a filled area — the proof a chart
   * actually rendered rather than throwing on its scale. Scoped through the series
   * group class (not a bare `path.area`): `AreaComponent`'s `path.area` is reused by
   * `LineSeriesComponent`'s always-present, hover-only `g.line-highlight` overlay, which
   * stays invisible until hovered and would otherwise false-negative this assertion.
   */
  public chartSeriesPaths(card: Locator): Locator {
    return card.locator('svg g.line-series path.line, svg g.area-series path.area');
  }
}
