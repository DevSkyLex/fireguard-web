import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { OrganizationPermissionService } from '@features/organization/access';
import type { ChecklistListOptions } from '@features/organization/features/checklists/models';
import type { ComplianceRollup } from '@features/organization/features/compliance/data-access/adapters/compliance-totals.adapter';
import {
  ComplianceChecklistsTableStore,
  type ComplianceChecklistsTableStoreType,
} from '@features/organization/features/compliance/state/checklists-table';
import { ComplianceSummaryStore } from '@features/organization/features/compliance/state/compliance-summary';
import type { ComplianceSummaryStoreType } from '@features/organization/features/compliance/state/compliance-summary';
import {
  ComplianceInspectionsReviewCountStore,
  type ComplianceInspectionsReviewCountStoreType,
} from '@features/organization/features/compliance/state/inspections-review-count';
import {
  ComplianceInspectionsTableStore,
  type ComplianceInspectionsTableStoreType,
} from '@features/organization/features/compliance/state/inspections-table';
import {
  ComplianceNonConformitiesTableStore,
  type ComplianceNonConformitiesTableStoreType,
} from '@features/organization/features/compliance/state/non-conformities-table';
import {
  ComplianceChecklistTable,
  ComplianceInspectionTable,
  ComplianceNonConformityTable,
  type ComplianceChecklistTableQuery,
  type ComplianceInspectionTableQuery,
  type ComplianceNonConformityTableQuery,
} from '@features/organization/features/compliance/ui/tables';
import type {
  InspectionListOptions,
  InspectionOutput,
  NonConformityOutput,
} from '@features/organization/features/inspections/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { MetricCard, Skeleton } from '@shared/components';

/**
 * Which section of the register is on screen.
 *
 * @since 2.0.0
 */
export type ComplianceTab = 'inspections' | 'non-conformities' | 'checklists';

/**
 * Component CompliancePage
 * @class CompliancePage
 *
 * @description
 * The organization's compliance register: a KPI strip and three read-only
 * listings (Inspections, Non-conformities, Checklists). Tabs are `?tab=`
 * rather than child routes because the route's single guard
 * (`organization.compliance.read`) covers the page shell only — the three
 * tabs additionally require `organization.inspection.read` (see
 * {@link canViewInspectionData}), which a route guard cannot express per
 * query-param value.
 *
 * The page is **additive**: it does not replace `/inspections`, which is
 * gated on a different permission.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-compliance',
  imports: [
    ButtonModule,
    MessageModule,
    TabsModule,
    ComplianceChecklistTable,
    ComplianceInspectionTable,
    ComplianceNonConformityTable,
    MetricCard,
    Skeleton,
  ],
  providers: [
    ComplianceSummaryStore,
    ComplianceChecklistsTableStore,
    ComplianceInspectionsReviewCountStore,
    ComplianceInspectionsTableStore,
    ComplianceNonConformitiesTableStore,
  ],
  templateUrl: './compliance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompliancePage {
  //#region Inputs
  /**
   * Input tab
   * @readonly
   *
   * @description
   * Active section, bound from `?tab=`. Anything unrecognised reads as
   * Inspections rather than rendering nothing.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly tab: InputSignal<string> = input<string>('inspections');
  //#endregion

  //#region Properties
  private readonly router: Router = inject<Router>(Router);
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /** The register rollup and KPI strip's source of truth for two of its four cards. */
  protected readonly summaryStore: ComplianceSummaryStoreType =
    inject<ComplianceSummaryStoreType>(ComplianceSummaryStore);
  /** Checklists tab data, loaded eagerly — its total also feeds the KPI strip. */
  protected readonly checklistsStore: ComplianceChecklistsTableStoreType =
    inject<ComplianceChecklistsTableStoreType>(ComplianceChecklistsTableStore);
  /** Dedicated "Inspections in review" KPI count — see the store's own docblock. */
  protected readonly reviewCountStore: ComplianceInspectionsReviewCountStoreType =
    inject<ComplianceInspectionsReviewCountStoreType>(ComplianceInspectionsReviewCountStore);
  /** Inspections tab data. */
  protected readonly inspectionsStore: ComplianceInspectionsTableStoreType =
    inject<ComplianceInspectionsTableStoreType>(ComplianceInspectionsTableStore);
  /** Non-conformities tab data. */
  protected readonly nonConformitiesStore: ComplianceNonConformitiesTableStoreType =
    inject<ComplianceNonConformitiesTableStoreType>(ComplianceNonConformitiesTableStore);

  /** Active organization id, or `null` while it is still resolving. */
  protected readonly organizationId: Signal<string | null> = computed(
    (): string | null => this.activeOrganizationStore.selectedOrganization()?.id ?? null,
  );

  /**
   * Property canViewInspectionData
   * @readonly
   *
   * @description
   * Whether the member holds `organization.inspection.read` — the permission
   * behind every endpoint the three tabs and two of the four KPI cards read
   * from. A member with `compliance.read` alone must not see those tabs
   * attempt (and fail) to load; see the class docblock.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canViewInspectionData: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
  );

  /** True once the organization id is known and inspection data is readable. */
  private readonly canLoadInspectionScoped: Signal<boolean> = computed(
    (): boolean => this.organizationId() !== null && this.canViewInspectionData(),
  );

  /** Active tab, defaulting to Inspections for anything unrecognised. */
  protected readonly activeTab: Signal<ComplianceTab> = computed((): ComplianceTab => {
    const value: string = this.tab();
    return value === 'non-conformities' || value === 'checklists' ? value : 'inspections';
  });

  /** Organization rollup backing the compliance-rate and open-NC KPI cards. */
  protected readonly rollup: Signal<ComplianceRollup> = computed(
    (): ComplianceRollup => this.summaryStore.rollup(),
  );

  /**
   * KPI 1 — compliance rate, or an em dash when nothing is tracked. The
   * backend returns `null` there, and "no schedule yet" is not "0%
   * compliant".
   */
  protected readonly complianceRateLabel: Signal<string> = computed((): string => {
    const rate: number | null = this.rollup().complianceRate;
    return rate === null ? '—' : `${Math.round(rate)}%`;
  });

  /** KPI 2 — open non-conformities across every severity. */
  protected readonly openNonConformities: Signal<number> = computed((): number => {
    const rollup: ComplianceRollup = this.rollup();
    return (
      rollup.openCriticalNonConformityCount +
      rollup.openHighNonConformityCount +
      rollup.openMediumNonConformityCount +
      rollup.openLowNonConformityCount
    );
  });

  /**
   * KPI 2's supporting line — how many of the open non-conformities are
   * critical. Only the critical count is exposed by the rollup with enough
   * confidence to headline; trend/due-date sublines are not fabricated.
   */
  protected readonly openNonConformitiesSub: Signal<string> = computed((): string => {
    const count: number = this.rollup().openCriticalNonConformityCount;
    return $localize`:@@compliance.kpi.openNonConformities.sub:${count}:count: critical`;
  });

  /**
   * KPI 3 — inspections currently `submitted` (awaiting closure). `null`
   * while unresolved or when the member cannot read inspection data — never
   * `0` for "not measured".
   */
  protected readonly inspectionsInReview: Signal<number | null> = computed((): number | null =>
    this.canViewInspectionData() ? this.reviewCountStore.reviewCount() : null,
  );

  /**
   * KPI 4 — checklist template count. Reflects the Checklists tab's current
   * query total (see {@link ComplianceChecklistsTableStore} docblock).
   */
  protected readonly checklistTemplateCount: Signal<number | null> = computed((): number | null =>
    this.canViewInspectionData() ? (this.checklistsStore.queryData()?.totalItems ?? null) : null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads the summary rollup, the eagerly-needed checklists/review-count KPI
   * sources, and defers the two remaining tabs to their table's own initial
   * lazy-load event (ARCHITECTURE §10.3 — a resolver or eager fetch here
   * would duplicate that first request).
   *
   * @since 2.0.0
   */
  public constructor() {
    this.summaryStore.load(this.organizationId);

    this.checklistsStore.load(
      computed(() =>
        this.canLoadInspectionScoped() ? { organizationId: this.organizationId() as string } : null,
      ),
    );

    this.reviewCountStore.load(
      computed(() => (this.canLoadInspectionScoped() ? this.organizationId() : null)),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method selectTab
   *
   * @description
   * Switches section through `?tab=`, keeping Inspections off the URL so the
   * default stays clean.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {ComplianceTab} tab - The section to show.
   *
   * @returns {void}
   */
  protected selectTab(tab: ComplianceTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'inspections' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method onTabChange
   *
   * @description
   * Adapts `p-tabs`' `valueChange` (untyped `string | number | undefined`)
   * into {@link selectTab}.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string | number | undefined} value - The tab value emitted by `p-tabs`.
   *
   * @returns {void}
   */
  protected onTabChange(value: string | number | undefined): void {
    if (value === 'non-conformities' || value === 'checklists' || value === 'inspections') {
      this.selectTab(value);
    }
  }

  /** Re-runs the summary query after a failure. */
  protected retry(): void {
    this.summaryStore.load(this.organizationId());
  }

  /** Runs the Inspections tab's query for the requested search/page/sort. */
  protected onInspectionsQuery(query: ComplianceInspectionTableQuery): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    const options: InspectionListOptions = {
      page: query.page,
      itemsPerPage: query.itemsPerPage,
      search: query.search,
      order: query.order,
    };
    this.inspectionsStore.load({ organizationId, options });
  }

  /** Runs the Non-conformities tab's query for the requested filters/page/sort. */
  protected onNonConformitiesQuery(query: ComplianceNonConformityTableQuery): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.nonConformitiesStore.load({
      organizationId,
      options: {
        page: query.page,
        itemsPerPage: query.itemsPerPage,
        severity: query.severity,
        status: query.status,
        search: query.search,
        order: query.order,
      },
    });
  }

  /** Runs the Checklists tab's query for the requested status/page/sort. */
  protected onChecklistsQuery(query: ComplianceChecklistTableQuery): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    const options: ChecklistListOptions = {
      page: query.page,
      itemsPerPage: query.itemsPerPage,
      status: query.status,
      order: query.order,
    };
    this.checklistsStore.load({ organizationId, options });
  }

  /** Opens the inspection an Inspections-tab row stands for. */
  protected openInspection(inspection: InspectionOutput): void {
    this.navigateToInspection(inspection.id);
  }

  /** Opens the inspection that recorded a Non-conformities-tab row. */
  protected openInspectionFromNonConformity(nonConformity: NonConformityOutput): void {
    this.navigateToInspection(nonConformity.inspectionId);
  }

  /** Shared navigation to an inspection's detail page. */
  private navigateToInspection(inspectionId: string): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    void this.router.navigate(['/organizations', organizationId, 'inspections', inspectionId]);
  }
  //#endregion
}
