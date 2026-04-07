import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type ResourceRef,
  type Signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { OrganizationService } from '@core/services/api/organization';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardOutput,
  OrganizationDashboardComparisonMetric,
  OrganizationDashboardComparisonMetricGroup,
} from '@core/models/organization';
import { OrganizationDashboardNonConformitiesOpenedTrend } from './organization-dashboard-non-conformities-opened-trend/organization-dashboard-non-conformities-opened-trend.component';
import { OrganizationDashboardNonConformitiesResolvedTrend } from './organization-dashboard-non-conformities-resolved-trend/organization-dashboard-non-conformities-resolved-trend.component';
import { OrganizationDashboardOverviewTrend } from './organization-dashboard-overview-trend/organization-dashboard-overview-trend.component';
import { OrganizationDashboardAssetGrowthTrend } from './organization-dashboard-asset-growth-trend';
import { OrganizationDashboardInspectionQualityTrend } from './organization-dashboard-inspection-quality-trend';
import { OrganizationDashboardMetricCard } from './organization-dashboard-metric-card';


/**
 * Type OrganizationDashboardKpiValue
 *
 * @description
 * Primitive KPI value extracted from an overview section summary
 * entry. Covers the numeric and formatted-string cases returned by
 * the backend, plus null when the metric is absent.
 */
type OrganizationDashboardKpiValue = number | string | null;

/**
 * Type OrganizationDashboardComparisonDelta
 *
 * @description
 * Scalar delta entry shown below a KPI card when the
 * previous-period comparison is enabled. Combines the
 * human-readable formatted value (e.g. `"+3"`) with the
 * direction indicator returned by the backend (`"up"` | `"down"`).
 */
type OrganizationDashboardComparisonDelta = {
  readonly value: string | number | null;
  readonly direction: number | string | null;
};

/**
 * Component OrganizationDashboard
 * @class OrganizationDashboard
 *
 * @description
 * Smart dashboard component for the organization overview page.
 * Fetches the aggregate `/dashboard` payload via `rxResource` and
 * derives KPI card values, health score and comparison delta as
 * `computed` signals consumed directly by the template.
 *
 * Child trend components handle their own independent data
 * requests and are mounted below the summary row.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard',
  templateUrl: './organization-dashboard.component.html',
  imports: [
    OrganizationDashboardMetricCard,
    OrganizationDashboardOverviewTrend,
    OrganizationDashboardInspectionQualityTrend,
    OrganizationDashboardNonConformitiesOpenedTrend,
    OrganizationDashboardNonConformitiesResolvedTrend,
    OrganizationDashboardAssetGrowthTrend,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboard {
  //#region Properties
  /**
   * Property organizationService
   * @readonly
   *
   * @description
   * API service used to fetch dashboard analytics from the
   * organization `/dashboard` endpoint.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationService}
   */
  private readonly organizationService: OrganizationService =
    inject<OrganizationService>(OrganizationService);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Signal store that holds the currently selected organization.
   * Drives the `dashboardResource` params, causing an automatic
   * re-fetch whenever the active organization changes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property dashboardResource
   * @readonly
   *
   * @description
   * Reactive resource that fetches the aggregate dashboard payload
   * for the currently active organization. Defaults to a one-month
   * window ending at the current instant. Re-fetches automatically
   * when the organization changes and exposes loading and error
   * states consumed by the skeleton template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ResourceRef<OrganizationDashboardOutput | undefined>}
   */
  protected readonly dashboardResource: ResourceRef<OrganizationDashboardOutput | undefined> =
    rxResource<OrganizationDashboardOutput, string | undefined>({
      params: (): string | undefined => this.activeOrganizationStore.selectedOrganization()?.id ?? undefined,
      stream: ({ params: organizationId }: { params: string | undefined }) => {
        /**
         * Constant now
         * @const now
         *
         * @description
         * Current instant, used as the end of the
         * default date range for the dashboard query.
         *
         * @type {Date}
         */
        const now: Date = new Date();

        /**
         * Constant to
         * @const to
         *
         * @description
         * ISO string representation of the `now` constant, used as the
         * `to` parameter for the default dashboard query.
         *
         * @type {string}
         */
        const to: string = now.toISOString();

        /**
         * Constant from
         * @const from
         *
         * @description
         * ISO string representation of the date one month before `now`, used
         * as the `from` parameter for the default dashboard query.
         *
         * @type {string}
         */
        const from: string = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

        // Defensive check to ensure we don't attempt a request with an undefined
        if (!organizationId) throw new Error('No active organization selected');

        return this.organizationService.getDashboard(organizationId, {
          from: from,
          to: to,
        });
      },
    });

  /**
   * Property facilityCount
   * @readonly
   *
   * @description
   * Total facility count read from the `overview.facilities.summary`
   * first entry. Returns null while the resource is loading or when
   * the entry is absent from the payload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardKpiValue>}
   */
  protected readonly facilityCount: Signal<OrganizationDashboardKpiValue> =
    computed<OrganizationDashboardKpiValue>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      // Return the value of the first entry in the facilities overview summary, or null if it's not present
      return dashboard?.overview?.['facilities']?.['summary']?.[0]?.['value'] ?? null;
    });

  /**
   * Property memberCount
   * @readonly
   *
   * @description
   * Total member count read from the `overview.members.summary`
   * first entry. Returns null while the resource is loading or when
   * the entry is absent from the payload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardKpiValue>}
   */
  protected readonly memberCount: Signal<OrganizationDashboardKpiValue> =
    computed<OrganizationDashboardKpiValue>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      // Return the value of the first entry in the members overview summary, or null if it's not present
      return dashboard?.overview?.['members']?.['summary']?.[0]?.['value'] ?? null;
    });

  /**
   * Property equipmentCount
   * @readonly
   *
   * @description
   * Total equipment count read from the `overview.equipment.summary`
   * first entry. Returns null while the resource is loading or when
   * the entry is absent from the payload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardKpiValue>}
   */
  protected readonly equipmentCount: Signal<OrganizationDashboardKpiValue> =
    computed<OrganizationDashboardKpiValue>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      // Return the value of the first entry in the equipment overview summary, or null if it's not present
      return dashboard?.overview?.['equipment']?.['summary']?.[0]?.['value'] ?? null;
    });

  /**
   * Property inspectionCount
   * @readonly
   *
   * @description
   * Total inspection count read from the `overview.inspections.summary`
   * first entry. Returns null while the resource is loading or when
   * the entry is absent from the payload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardKpiValue>}
   */
  protected readonly inspectionCount: Signal<OrganizationDashboardKpiValue> =
    computed<OrganizationDashboardKpiValue>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      // Return the value of the first entry in the inspections overview summary, or null if it's not present
      return dashboard?.overview?.['inspections']?.['summary']?.[0]?.['value'] ?? null;
    });

  /**
   * Property inspectionsComparison
   * @readonly
   *
   * @description
   * Previous-period comparison delta for the inspections KPI count.
   * Pulled from `comparison.metrics` by matching the
   * `"inspections"` key. Returns null when the comparison mode is
   * disabled or when the matching entry is absent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardComparisonDelta | null>}
   */
  protected readonly inspectionsComparison: Signal<OrganizationDashboardComparisonDelta | null> =
    computed<OrganizationDashboardComparisonDelta | null>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      /**
       * Constant metrics
       * @const metrics
       *
       * @description
       * Metrics array extracted from the dashboard payload's comparison section,
       * specifically for the inspections key.
       *
       * @type {OrganizationDashboardComparisonMetricGroup | undefined}
       */
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        dashboard?.comparison?.metrics;

      /**
       * Constant entry
       * @const entry
       *
       * @description
       * Entry in the metrics comparison array matching the "inspections"
       * key, which contains the value and direction for the
       * inspections KPI comparison delta.
       *
       * Returns undefined if not found.
       *
       * @type {OrganizationDashboardComparisonMetric | undefined}
       */
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'inspections',
      );

      // If the entry is not found, return null to indicate that the comparison delta cannot be computed
      if (!entry) return null;

      return {
        value: entry['value'],
        direction: entry['direction'],
      };
    });

  /**
   * Property facilitiesComparison
   * @readonly
   *
   * @description
   * Previous-period comparison delta for
   * the facilities KPI count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardComparisonDelta | null>}
   */
  protected readonly facilitiesComparison: Signal<OrganizationDashboardComparisonDelta | null> =
    computed<OrganizationDashboardComparisonDelta | null>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      /**
       * Constant metrics
       * @const metrics
       *
       * @description
       * Metrics array extracted from the dashboard payload's comparison section,
       * specifically for the facilities key.
       *
       * @type {OrganizationDashboardComparisonMetricGroup | undefined}
       */
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        dashboard?.comparison?.metrics;

      /**
       * Constant entry
       * @const entry
       *
       * @description
       * Entry in the metrics comparison array matching the "facilities"
       * key, which contains the value and direction for the
       * facilities KPI comparison delta.
       *
       * Returns undefined if not found.
       *
       * @type {OrganizationDashboardComparisonMetric | undefined}
       */
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'facilities',
      );

      // If the entry is not found, return null to indicate that the comparison delta cannot be computed
      if (!entry) return null;

      return { value: entry['value'], direction: entry['direction'] };
    });

  /**
   * Property membersComparison
   * @readonly
   *
   * @description
   * Previous-period comparison delta for the members KPI count.
   * Pulled from `comparison.metrics` by matching the
   * `"members"` key. Returns null when the comparison mode is
   * disabled or when the matching entry is absent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardComparisonDelta | null>}
   */
  protected readonly membersComparison: Signal<OrganizationDashboardComparisonDelta | null> =
    computed<OrganizationDashboardComparisonDelta | null>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      /**
       * Constant metrics
       * @const metrics
       *
       * @description
       * Metrics array extracted from the dashboard payload's comparison section,
       * specifically for the members key.
       *
       * @type {OrganizationDashboardComparisonMetricGroup | undefined}
       */
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        dashboard?.comparison?.metrics;

      /**
       * Constant entry
       * @const entry
       *
       * @description
       * Entry in the metrics comparison array matching the "members"
       * key, which contains the value and direction for the
       * members KPI comparison delta.
       *
       * Returns undefined if not found.
       *
       * @type {OrganizationDashboardComparisonMetric | undefined}
       */
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'members',
      );

      // If the entry is not found, return null to indicate that the comparison delta cannot be computed
      if (!entry) return null;

      return { value: entry['value'], direction: entry['direction'] };
    });

  /**
   * Property equipmentComparison
   * @readonly
   *
   * @description
   * Previous-period comparison delta for the equipment KPI count.
   * Pulled from `comparison.metrics` by matching the
   * `"equipment"` key. Returns null when the comparison mode is
   * disabled or when the matching entry is absent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardComparisonDelta | null>}
   */
  protected readonly equipmentComparison: Signal<OrganizationDashboardComparisonDelta | null> =
    computed<OrganizationDashboardComparisonDelta | null>(() => {
      /**
       * Constant dashboard
       * @const dashboard
       *
       * @description
       * Current value of the `dashboardResource`, typed as a local variable
       * to avoid repeated optional chaining and improve readability of the
       * return statement.
       *
       * @type {OrganizationDashboardOutput | undefined}
       */
      const dashboard: OrganizationDashboardOutput | undefined =
        this.dashboardResource.value();

      /**
       * Constant metrics
       * @const metrics
       *
       * @description
       * Metrics array extracted from the dashboard payload's comparison section,
       * specifically for the equipment key.
       *
       * @type {OrganizationDashboardComparisonMetricGroup | undefined}
       */
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        dashboard?.comparison?.metrics;

      /**
       * Constant entry
       * @const entry
       *
       * @description
       * Entry in the metrics comparison array matching the "equipment"
       * key, which contains the value and direction for the
       * equipment KPI comparison delta.
       *
       * Returns undefined if not found.
       *
       * @type {OrganizationDashboardComparisonMetric | undefined}
       */
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'equipment',
      );

      // If the entry is not found, return null to indicate that the comparison delta cannot be computed
      if (!entry) return null;

      return { value: entry['value'], direction: entry['direction'] };
    });
  //#endregion
}

