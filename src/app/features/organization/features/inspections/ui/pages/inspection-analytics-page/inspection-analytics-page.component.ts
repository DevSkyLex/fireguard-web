import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideClock, lucideGauge, lucideTriangleAlert } from '@ng-icons/lucide';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import {
  resolveInspectionStatusTag,
  type InspectionStatusTagDescriptor,
  type NonConformitySeverity,
  type NonConformityStatisticsOptions,
} from '@features/organization/features/inspections/models';
import {
  NonConformityStatisticsStore,
  type NonConformityStatisticsStoreType,
} from '@features/organization/features/inspections/state';
import { StatTile } from '@features/organization/ui/components';
import { CollectionSkeletonRows } from '@shared/collection-surface';
import { StateIllustration } from '@shared/state-illustration';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Type InspectionAnalyticsPeriodPreset
 *
 * @description
 * The window presets the page offers — the dashboard Trends selector's four
 * ranges plus `all` (no bounds), since the statistics endpoint treats an
 * absent window as all-time. Feature-local, not a backend enum: it only
 * decides the `{from, to}` pair sent to the statistics endpoint.
 *
 * @since 1.0.0
 *
 * @type
 */
type InspectionAnalyticsPeriodPreset = '7d' | '30d' | '90d' | '12m' | 'all';

/**
 * Type InspectionAnalyticsSeverityRow
 *
 * @description
 * View-model for one severity row: the open and resolved counters, the open
 * count's share of all open non-conformities (the proportional bar), and
 * the registry descriptor pairing the severity with its label and icon —
 * never colour alone.
 *
 * @since 1.0.0
 *
 * @type
 */
type InspectionAnalyticsSeverityRow = {
  /**
   * Property severity
   * @readonly
   *
   * @description
   * Selects the severity represented by this non-conformity row.
   *
   * @access public
   *
   * @type {NonConformitySeverity}
   */
  readonly severity: NonConformitySeverity;

  /**
   * Property open
   * @readonly
   *
   * @description
   * Identifies the record currently being edited, when one exists.
   *
   * @access public
   *
   * @type {number}
   */
  readonly open: number;

  /**
   * Property resolved
   * @readonly
   *
   * @description
   * Counts resolved non-conformities in the selected statistics window.
   *
   * @access public
   *
   * @type {number}
   */
  readonly resolved: number;

  /**
   * Property percent
   * @readonly
   *
   * @description
   * Reports the percentage represented by this statistics row.
   *
   * @access public
   *
   * @type {number}
   */
  readonly percent: number;

  /**
   * Property descriptor
   * @readonly
   *
   * @description
   * Provides the status label and icon used for this non-conformity.
   *
   * @access public
   *
   * @type {InspectionStatusTagDescriptor}
   */
  readonly descriptor: InspectionStatusTagDescriptor;
};

/**
 * Constant SEVERITY_ORDER
 *
 * @description
 * Render order for the severity breakdown, most urgent first — the same
 * order the dashboard's breakdown uses.
 *
 * @since 1.0.0
 *
 * @type {readonly NonConformitySeverity[]}
 */
const SEVERITY_ORDER: readonly NonConformitySeverity[] = ['critical', 'high', 'medium', 'low'];

/**
 * Class InspectionAnalyticsPage
 * @class InspectionAnalyticsPage
 *
 * @description
 * The non-conformity analytics page at
 * `/organizations/:organizationId/inspections/analytics`: a KPI strip (open
 * total, SLA-breached open, average and median resolution days), the
 * per-severity open/resolved breakdown as labelled proportional bars, and
 * the top-10 facilities / equipment types by open count as tables. Reading
 * is gated by the feature's own `organization.inspection.read` guard on the
 * pathless parent route.
 * The severity bars reuse the dashboard's pattern — `hlm-progress` behind a
 * label+icon descriptor from the inspection status-tag registry — rather
 * than extending the shared line-chart primitive: a four-row categorical
 * breakdown does not need a chart, and the achromatic-safe rule (severity
 * as label + icon, never colour alone) is already what the registry
 * enforces.
 * The period selector mirrors the dashboard Trends presets and adds "All
 * time" as the default-adjacent widest window; presets resolve to inclusive
 * ISO 8601 `{from, to}` bounds on `createdAt` at select time, and every
 * organization or period change refetches the whole snapshot.
 * The equipment-type table renders localized labels through the
 * `equipments` feature's public `EQUIPMENT_TYPE_OPTIONS` registry rather
 * than the raw backend enum key — this page is a new cross-feature consumer
 * of that registry (`organization/FEATURE.md`).
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-analytics-page',
  imports: [
    NgIcon,
    RouterLink,
    ...HlmEmptyImports,
    StateIllustration,
    HlmButton,
    HlmCardImports,
    HlmProgressImports,
    HlmSkeleton,
    HlmTableImports,
    HlmToggleGroupImports,
    CollectionSkeletonRows,
    StatTile,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideClock, lucideGauge, lucideTriangleAlert })],
  templateUrl: './inspection-analytics-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionAnalyticsPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Route-provided owner of the statistics snapshot query.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NonConformityStatisticsStoreType}
   */
  protected readonly store: NonConformityStatisticsStoreType =
    inject<NonConformityStatisticsStoreType>(NonConformityStatisticsStore);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The `:organizationId` route parameter, bound by the router's component
   * input binding — the same channel every page of this feature reads it
   * from.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property selectedPeriod
   * @readonly
   *
   * @description
   * Holds the period preset used to request the inspection analytics snapshot.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InspectionAnalyticsPeriodPreset>}
   */
  protected readonly selectedPeriod: WritableSignal<InspectionAnalyticsPeriodPreset> =
    signal<InspectionAnalyticsPeriodPreset>('30d');

  /**
   * Property severitySkeletonRows
   * @readonly
   *
   * @description
   * Provides row indices used to render loading placeholders for severity data.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly number[]}
   */
  protected readonly severitySkeletonRows: readonly number[] = [0, 1, 2, 3];

  /**
   * Property severityRows
   * @readonly
   *
   * @description
   * The four severities in most-urgent-first order, each with its open and
   * resolved counters and the open share of all open rows. The backend
   * always ships all four keys with zeros included, but the fallback keeps
   * a partial payload from throwing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InspectionAnalyticsSeverityRow[]>}
   */
  protected readonly severityRows: Signal<readonly InspectionAnalyticsSeverityRow[]> = computed(
    () => {
      const bySeverity = this.store.queryData()?.bySeverity;
      const rows = SEVERITY_ORDER.map((severity) => ({
        severity,
        open: bySeverity?.[severity]?.open ?? 0,
        resolved: bySeverity?.[severity]?.resolved ?? 0,
      }));
      const totalOpen: number = rows.reduce((sum, row) => sum + row.open, 0);

      return rows.map((row): InspectionAnalyticsSeverityRow => ({
        severity: row.severity,
        open: row.open,
        resolved: row.resolved,
        percent: totalOpen > 0 ? Math.round((row.open / totalOpen) * 100) : 0,
        descriptor: resolveInspectionStatusTag('nonConformitySeverity', row.severity),
      }));
    },
  );

  /**
   * Property totalOpen
   * @readonly
   *
   * @description
   * Counts open non-conformities across the loaded severity rows.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly totalOpen: Signal<number> = computed<number>(() =>
    this.severityRows().reduce((sum, row) => sum + row.open, 0),
  );

  /**
   * Property totalResolved
   * @readonly
   *
   * @description
   * Counts resolved non-conformities across the loaded severity rows.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly totalResolved: Signal<number> = computed<number>(() =>
    this.severityRows().reduce((sum, row) => sum + row.resolved, 0),
  );

  /**
   * Property openResolvedCaption
   * @readonly
   *
   * @description
   * The open KPI's dynamic caption: how many were resolved in the same window.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly openResolvedCaption: Signal<string> = computed<string>(() => {
    const resolved: number = this.totalResolved();

    return resolved === 1
      ? $localize`:@@inspection.analytics.kpi.open.resolvedCaptionOne:1 resolved in the period`
      : $localize`:@@inspection.analytics.kpi.open.resolvedCaptionMany:${resolved}:count: resolved in the period`;
  });

  /**
   * Property averageDaysLabel
   * @readonly
   *
   * @description
   * Formats the average resolution time for display in the analytics summary.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly averageDaysLabel: Signal<string> = computed<string>(() =>
    this.formatDays(this.store.queryData()?.resolution?.averageDays),
  );

  /**
   * Property medianDaysLabel
   * @readonly
   *
   * @description
   * Formats the median resolution time for display in the analytics summary.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly medianDaysLabel: Signal<string> = computed<string>(() =>
    this.formatDays(this.store.queryData()?.resolution?.medianDays),
  );

  /**
   * Property isSnapshotEmpty
   * @readonly
   *
   * @description
   * Indicates that a loaded snapshot contains no open or resolved non-conformities.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly isSnapshotEmpty: Signal<boolean> = computed<boolean>(
    () => this.store.isQueryLoaded() && this.totalOpen() === 0 && this.totalResolved() === 0,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Refetches the snapshot whenever the active organization or the period
   * preset changes.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const organizationId: string = this.organizationId();
      const preset: InspectionAnalyticsPeriodPreset = this.selectedPeriod();

      this.store.load({ organizationId, window: this.resolveWindow(preset) });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onPeriodChanged
   * @method onPeriodChanged
   *
   * @description
   * Narrows `hlm-toggle-group`'s single/multi-select payload before writing {@link selectedPeriod}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted
   *   value.
   *
   * @returns {void}
   */
  protected onPeriodChanged(value: string | readonly string[] | null | undefined): void {
    const preset: string | null = typeof value === 'string' ? value : null;

    this.selectedPeriod.set(
      preset === '7d' || preset === '90d' || preset === '12m' || preset === 'all' ? preset : '30d',
    );
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-runs the statistics query after a failure, same organization and window.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.load({
      organizationId: this.organizationId(),
      window: this.resolveWindow(this.selectedPeriod()),
    });
  }

  /**
   * Method resolveWindow
   * @method resolveWindow
   *
   * @description
   * Resolves one preset into the inclusive ISO 8601 `{from, to}` window the endpoint expects —
   * `undefined` for "all time".
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InspectionAnalyticsPeriodPreset} preset - The selected preset window.
   *
   * @returns {NonConformityStatisticsOptions | undefined} The resolved window, or none.
   */
  private resolveWindow(
    preset: InspectionAnalyticsPeriodPreset,
  ): NonConformityStatisticsOptions | undefined {
    if (preset === 'all') return undefined;

    const to = new Date();
    const from = new Date(to);

    switch (preset) {
      case '7d':
        from.setDate(from.getDate() - 7);
        break;
      case '90d':
        from.setDate(from.getDate() - 90);
        break;
      case '12m':
        from.setMonth(from.getMonth() - 12);
        break;
      default:
        from.setDate(from.getDate() - 30);
        break;
    }

    return { from: from.toISOString(), to: to.toISOString() };
  }

  /**
   * Method formatDays
   * @method formatDays
   *
   * @description
   * Formats a fractional-days figure to one decimal, an em dash when the window resolved nothing
   * (`null` server-side arrives as `undefined` — API Platform omits null fields).
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number | null | undefined} days - The raw fractional days.
   *
   * @returns {string} The display label.
   */
  private formatDays(days: number | null | undefined): string {
    return days == null ? '—' : days.toFixed(1);
  }

  /**
   * Method typeLabelOf
   * @method typeLabelOf
   *
   * @description
   * The localized equipment type label for a raw backend enum key, falling back to a humanized form
   * of the key itself when the registry does not know it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} type - The raw equipment type key.
   *
   * @returns {string} The localized label, or a humanized fallback.
   */
  protected typeLabelOf(type: string): string {
    return (
      EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
      type.replaceAll('_', ' ')
    );
  }

  /**
   * Method severityAriaLabelOf
   * @method severityAriaLabelOf
   *
   * @description
   * The severity progress bar's accessible name, naming the severity and its open share together
   * rather than relying on a nearby visual label alone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InspectionAnalyticsSeverityRow} row - The severity row being rendered.
   *
   * @returns {string} The bar's accessible name.
   */
  protected severityAriaLabelOf(row: InspectionAnalyticsSeverityRow): string {
    return $localize`:@@inspection.analytics.severity.progressAriaLabel:${row.descriptor.label}:severity: — ${row.percent}:percent:% of open non-conformities`;
  }
  //#endregion
}
