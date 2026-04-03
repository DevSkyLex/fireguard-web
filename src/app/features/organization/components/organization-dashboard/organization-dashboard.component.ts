import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type ResourceRef,
  type Signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { Card } from '@shared/components';
import { OrganizationService } from '@core/services/api/organization';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardOutput,
  OrganizationDashboardComparisonMetric,
} from '@core/models/organization';
import { OrganizationDashboardInspectionsTrend } from './organization-dashboard-inspections-trend/organization-dashboard-inspections-trend.component';
import { OrganizationDashboardNonConformitiesOpenedTrend } from './organization-dashboard-non-conformities-opened-trend/organization-dashboard-non-conformities-opened-trend.component';
import { OrganizationDashboardNonConformitiesResolvedTrend } from './organization-dashboard-non-conformities-resolved-trend/organization-dashboard-non-conformities-resolved-trend.component';
import { OrganizationDashboardOverviewTrend } from './organization-dashboard-overview-trend/organization-dashboard-overview-trend.component';
import { OrganizationDashboardEquipmentCreatedTrend } from './organization-dashboard-equipment-created-trend/organization-dashboard-equipment-created-trend.component';
import { OrganizationDashboardFacilitiesCreatedTrend } from './organization-dashboard-facilities-created-trend/organization-dashboard-facilities-created-trend.component';

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
  readonly direction: string | null;
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
    Card,
    SkeletonModule,
    OrganizationDashboardOverviewTrend,
    OrganizationDashboardInspectionsTrend,
    OrganizationDashboardNonConformitiesOpenedTrend,
    OrganizationDashboardNonConformitiesResolvedTrend,
    OrganizationDashboardEquipmentCreatedTrend,
    OrganizationDashboardFacilitiesCreatedTrend,
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
      params: (): string | undefined =>
        this.activeOrganizationStore.selectedOrganization()?.id ?? undefined,
      stream: ({ params: orgId }: { params: string | undefined }) => {
        const now: Date = new Date();
        return this.organizationService.getDashboard(orgId!, {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
          to: now.toISOString(),
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
    computed<OrganizationDashboardKpiValue>(
      () =>
        (this.dashboardResource.value()?.overview?.['facilities']?.['summary'] as
          | readonly Record<string, unknown>[]
          | undefined)?.[0]?.['value'] as OrganizationDashboardKpiValue ?? null,
    );

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
    computed<OrganizationDashboardKpiValue>(
      () =>
        (this.dashboardResource.value()?.overview?.['members']?.['summary'] as
          | readonly Record<string, unknown>[]
          | undefined)?.[0]?.['value'] as OrganizationDashboardKpiValue ?? null,
    );

  /**
   * Property readinessScore
   * @readonly
   *
   * @description
   * Organization readiness health score, extracted from the
   * `health.metrics` array by matching the `"readiness"` key.
   * Returns null while loading or when the metric is not present.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardKpiValue>}
   */
  protected readonly readinessScore: Signal<OrganizationDashboardKpiValue> =
    computed<OrganizationDashboardKpiValue>(() => {
      const metrics: readonly Record<string, unknown>[] | undefined =
        this.dashboardResource.value()?.health?.['metrics'] as
          | readonly Record<string, unknown>[]
          | undefined;
      return (
        metrics?.find(
          (m: Record<string, unknown>) => m['key'] === 'readiness',
        )?.['value'] as OrganizationDashboardKpiValue
      ) ?? null;
    });

  /**
   * Property inspectionsComparison
   * @readonly
   *
   * @description
   * Previous-period comparison delta for the inspections KPI.
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
      const metrics: OrganizationDashboardComparisonMetric[] | undefined =
        this.dashboardResource.value()?.comparison?.metrics as
          | OrganizationDashboardComparisonMetric[]
          | undefined;
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) =>
          (m as Record<string, unknown>)['key'] === 'inspections',
      );
      if (!entry) return null;
      return {
        value: (entry as Record<string, unknown>)['value'] as string | number | null,
        direction: (entry as Record<string, unknown>)['direction'] as string | null,
      };
    });
  //#endregion
}

