import type { HydraItem } from '@core/api/models';
import type { MaintenanceEconomicAmount } from './maintenance-economic-amount.interface';
import type { MaintenanceEconomicRow } from './maintenance-economic-row.interface';
import type { MaintenanceFinancialSourceDossier } from './maintenance-financial-source-dossier.interface';
import type { MaintenanceProcurementOverview } from './maintenance-procurement-overview.interface';

/**
 * Interface MaintenanceEconomicReconciliation
 * @interface MaintenanceEconomicReconciliation
 *
 * @description
 * Source dossier totals reconcile selected allocations plus explicitly excluded targets.
 */
export interface MaintenanceEconomicReconciliation {
  /**
   * Property sourceCurrent
   * @readonly
   *
   * @description
   * Full source realized amount before equipment allocation filtering.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly sourceCurrent: MaintenanceEconomicAmount;

  /**
   * Property excludedCurrent
   * @readonly
   *
   * @description
   * Current facts outside the selected allocation target.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly excludedCurrent: MaintenanceEconomicAmount;

  /**
   * Property sourceFrozen
   * @readonly
   *
   * @description
   * Full source immutable closure amount.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly sourceFrozen: MaintenanceEconomicAmount;

  /**
   * Property excludedFrozen
   * @readonly
   *
   * @description
   * Frozen facts outside the selected allocation target.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly excludedFrozen: MaintenanceEconomicAmount;

  /**
   * Property sourcePlanned
   * @readonly
   *
   * @description
   * Full source resource estimates.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly sourcePlanned: MaintenanceEconomicAmount;

  /**
   * Property excludedPlanned
   * @readonly
   *
   * @description
   * Estimated facts outside the selected allocation target.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly excludedPlanned: MaintenanceEconomicAmount;

  /**
   * Property reconciled
   * @readonly
   *
   * @description
   * Server assertion that selected and excluded allocations preserve all source facts.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly reconciled: boolean;
}

/**
 * Interface MaintenanceEconomicReportOutput
 * @interface MaintenanceEconomicReportOutput
 *
 * @description
 * Server-calculated bounded financial report; totals cover all filtered results, never only the
 * visible page.
 */
export interface MaintenanceEconomicReportOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable organization identity for the aggregate resource.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property dossiers
   * @readonly
   *
   * @description
   * Complete bounded source names; a row uses its exact interventionIds to select these sources.
   *
   * @access public
   *
   * @type {readonly MaintenanceFinancialSourceDossier[]}
   */
  readonly dossiers: readonly MaintenanceFinancialSourceDossier[];

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Authorized organization identity used by the session fence.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property from
   * @readonly
   *
   * @description
   * Inclusive report first civil date.
   *
   * @access public
   *
   * @type {string}
   */
  readonly from: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Inclusive report last civil date.
   *
   * @access public
   *
   * @type {string}
   */
  readonly to: string;

  /**
   * Property groupBy
   * @readonly
   *
   * @description
   * Server-owned allocation dimension.
   *
   * @access public
   *
   * @type {'equipment' | 'site' | 'customer'}
   */
  readonly groupBy: 'equipment' | 'site' | 'customer';

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Single organization currency for every reported amount.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Actual one-based result page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Actual server result page size.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage: number;

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Total number of allocated destinations across all pages.
   *
   * @access public
   *
   * @type {number}
   */
  readonly totalItems: number;

  /**
   * Property interventionCount
   * @readonly
   *
   * @description
   * Number of selected source work dossiers.
   *
   * @access public
   *
   * @type {number}
   */
  readonly interventionCount: number;

  /**
   * Property publishedInterventionCount
   * @readonly
   *
   * @description
   * Source work dossiers that have been published.
   *
   * @access public
   *
   * @type {number}
   */
  readonly publishedInterventionCount: number;

  /**
   * Property liveInterventionCount
   * @readonly
   *
   * @description
   * Source work dossiers that remain live.
   *
   * @access public
   *
   * @type {number}
   */
  readonly liveInterventionCount: number;

  /**
   * Property missingSnapshotCount
   * @readonly
   *
   * @description
   * Historical publications with no immutable financial snapshot.
   *
   * @access public
   *
   * @type {number}
   */
  readonly missingSnapshotCount: number;

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Visible allocated destinations only; their amounts are not the overall total.
   *
   * @access public
   *
   * @type {readonly MaintenanceEconomicRow[]}
   */
  readonly rows: readonly MaintenanceEconomicRow[];

  /**
   * Property unallocated
   * @readonly
   *
   * @description
   * Distinct unresolved allocation facts, displayed separately from destination pages.
   *
   * @access public
   *
   * @type {MaintenanceEconomicRow}
   */
  readonly unallocated: MaintenanceEconomicRow;

  /**
   * Property current
   * @readonly
   *
   * @description
   * Full filtered realized amount, including explicit unallocated contributions.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly current: MaintenanceEconomicAmount;

  /**
   * Property frozen
   * @readonly
   *
   * @description
   * Full filtered immutable closure amount.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly frozen: MaintenanceEconomicAmount;

  /**
   * Property planned
   * @readonly
   *
   * @description
   * Full filtered resource estimates, using global dossier budgets only when no resources are
   * estimated.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly planned: MaintenanceEconomicAmount;

  /**
   * Property budget
   * @readonly
   *
   * @description
   * Full filtered budgets, independent of resource estimates.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly budget: MaintenanceEconomicAmount;

  /**
   * Property variance
   * @readonly
   *
   * @description
   * Exact current-minus-resource-estimate difference, absent if incomplete.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly variance?: string | null;

  /**
   * Property reconciliation
   * @readonly
   *
   * @description
   * Original source versus selected and excluded allocation totals.
   *
   * @access public
   *
   * @type {MaintenanceEconomicReconciliation}
   */
  readonly reconciliation: MaintenanceEconomicReconciliation;

  /**
   * Property procurement
   * @readonly
   *
   * @description
   * Organization order-creation-window overview with separate receipt history semantics.
   *
   * @access public
   *
   * @type {MaintenanceProcurementOverview}
   */
  readonly procurement: MaintenanceProcurementOverview;
}
