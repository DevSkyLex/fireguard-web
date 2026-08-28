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
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideClock,
  lucideGauge,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
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
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
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
 */
type InspectionAnalyticsSeverityRow = {
  readonly severity: NonConformitySeverity;
  readonly open: number;
  readonly resolved: number;
  readonly percent: number;
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
 * Component InspectionAnalyticsPage
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
 *
 * The severity bars reuse the dashboard's pattern — `hlm-progress` behind a
 * label+icon descriptor from the inspection status-tag registry — rather
 * than extending the shared line-chart primitive: a four-row categorical
 * breakdown does not need a chart, and the achromatic-safe rule (severity
 * as label + icon, never colour alone) is already what the registry
 * enforces.
 *
 * The period selector mirrors the dashboard Trends presets and adds "All
 * time" as the default-adjacent widest window; presets resolve to inclusive
 * ISO 8601 `{from, to}` bounds on `createdAt` at select time, and every
 * organization or period change refetches the whole snapshot.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-analytics-page',
  imports: [
    NgIcon,
    EmptyState,
    ErrorState,
    HlmButton,
    HlmCardImports,
    HlmProgressImports,
    HlmSkeleton,
    HlmTableImports,
    HlmToggleGroupImports,
    StatTile,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleCheck,
      lucideClock,
      lucideGauge,
      lucideTriangleAlert,
    }),
  ],
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

  /** The active preset window. Defaults to 30 days, like the dashboard's Trends section. */
  protected readonly selectedPeriod: WritableSignal<InspectionAnalyticsPeriodPreset> =
    signal<InspectionAnalyticsPeriodPreset>('30d');

  /** Placeholder row count shown while the severity breakdown loads. */
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

  /** The open total across every severity — the first KPI. */
  protected readonly totalOpen: Signal<number> = computed<number>(() =>
    this.severityRows().reduce((sum, row) => sum + row.open, 0),
  );

  /** The resolved total across every severity, shown as the open KPI's caption context. */
  protected readonly totalResolved: Signal<number> = computed<number>(() =>
    this.severityRows().reduce((sum, row) => sum + row.resolved, 0),
  );

  /** Average resolution days, formatted to one decimal — an em dash when nothing was resolved in the window. */
  protected readonly averageDaysLabel: Signal<string> = computed<string>(() =>
    this.formatDays(this.store.queryData()?.resolution?.averageDays),
  );

  /** Median resolution days, formatted to one decimal — an em dash when nothing was resolved in the window. */
  protected readonly medianDaysLabel: Signal<string> = computed<string>(() =>
    this.formatDays(this.store.queryData()?.resolution?.medianDays),
  );

  /** Whether the loaded snapshot holds no non-conformity at all — open or resolved. */
  protected readonly isSnapshotEmpty: Signal<boolean> = computed<boolean>(
    () => this.store.isQueryLoaded() && this.totalOpen() === 0 && this.totalResolved() === 0,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Refetches the snapshot whenever the active organization or the period
   * preset changes.
   *
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
   * @description Narrows `hlm-toggle-group`'s single/multi-select payload before writing {@link selectedPeriod}.
   * @access protected
   * @since 1.0.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
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
   * @description Re-runs the statistics query after a failure, same organization and window.
   * @access protected
   * @since 1.0.0
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
   * @description Resolves one preset into the inclusive ISO 8601 `{from, to}` window the endpoint expects — `undefined` for "all time".
   * @access private
   * @since 1.0.0
   * @param {InspectionAnalyticsPeriodPreset} preset - The selected preset window.
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
   * @description Formats a fractional-days figure to one decimal, an em dash when the window resolved nothing (`null` server-side arrives as `undefined` — API Platform omits null fields).
   * @access private
   * @since 1.0.0
   * @param {number | null | undefined} days - The raw fractional days.
   * @returns {string} The display label.
   */
  private formatDays(days: number | null | undefined): string {
    return days == null ? '—' : days.toFixed(1);
  }
  //#endregion
}
