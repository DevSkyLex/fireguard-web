import type { MaintenanceEconomicAmount } from '../maintenance-economic-amount.interface';
import type { MaintenanceEconomicReportOutput } from '../maintenance-economic-report-output.interface';
import type { MaintenanceEconomicRow } from '../maintenance-economic-row.interface';

/**
 * Constant REPORT_INTERVENTION_ID
 *
 * @description
 * Stable source dossier shared by the allocated and unallocated financial fixture contributions.
 *
 * @access public
 * @since unreleased
 */
export const REPORT_INTERVENTION_ID = '810e8400-e29b-41d4-a716-446655810001';

/**
 * Constant REPORT_OTHER_INTERVENTION_ID
 *
 * @description
 * Independent dossier identity used to verify exact source selection.
 *
 * @access public
 * @since unreleased
 */
export const REPORT_OTHER_INTERVENTION_ID = '810e8400-e29b-41d4-a716-446655810009';

/**
 * Constant REPORT_SITE_ID
 *
 * @description
 * Stable named site identity for private financial scope tests.
 *
 * @access public
 * @since unreleased
 */
export const REPORT_SITE_ID = '810e8400-e29b-41d4-a716-446655810010';

/**
 * Constant REPORT_CUSTOMER_ID
 *
 * @description
 * Internal customer identity used without loading contacts or ordinary client resources.
 *
 * @access public
 * @since unreleased
 */
export const REPORT_CUSTOMER_ID = '810e8400-e29b-41d4-a716-446655810011';

/**
 * Constant REPORT_EQUIPMENT_ID
 *
 * @description
 * Individual equipment identity used by allocation and named directory fixtures.
 *
 * @access public
 * @since unreleased
 */
export const REPORT_EQUIPMENT_ID = '810e8400-e29b-41d4-a716-446655810012';

/**
 * Function economicAmount
 *
 * @description
 * Creates a complete exact metric while retaining the count of its source contributions.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} total - Exact six-place amount, including known zero.
 * @param {number} contributionCount - Number of known source contributions retained by the fixture.
 *
 * @returns {MaintenanceEconomicAmount} Complete metric with no unknown valuation.
 */
export function economicAmount(
  total = '0.000000',
  contributionCount = 0,
): MaintenanceEconomicAmount {
  return { total, knownTotal: total, complete: true, contributionCount, unknownCount: 0 };
}

/**
 * Function maintenanceReportFixture
 *
 * @description
 * Builds a reconciled private report with separate source dossiers, forecasts and procurement
 * metrics.
 *
 * @access public
 * @since unreleased
 *
 * @param {Partial<MaintenanceEconomicReportOutput>} overrides - Explicit scenario-specific
 *   transport fields.
 *
 * @returns {MaintenanceEconomicReportOutput} Typed economic fixture without floating-point monetary
 *   values.
 */
export function maintenanceReportFixture(
  overrides: Partial<MaintenanceEconomicReportOutput> = {},
): MaintenanceEconomicReportOutput {
  const current = economicAmount('35.000000', 3),
    frozen = economicAmount('20.000000', 2),
    planned = economicAmount('24.000000', 2),
    budget = economicAmount('100.000000', 1);
  const rows: readonly MaintenanceEconomicRow[] = [
    {
      id: REPORT_EQUIPMENT_ID,
      name: 'Entrance extinguisher — EX-001',
      identityState: 'captured',
      allocationComplete: true,
      current: economicAmount('10.000000', 1),
      frozen: economicAmount('8.000000', 1),
      planned: economicAmount('9.000000', 1),
      budget: economicAmount(),
      variance: '1.000000',
      interventionIds: [REPORT_INTERVENTION_ID],
    },
    {
      id: '810e8400-e29b-41d4-a716-446655810013',
      name: 'Hall extinguisher — EX-002',
      identityState: 'captured',
      allocationComplete: true,
      current: economicAmount('20.000000', 1),
      frozen: economicAmount('12.000000', 1),
      planned: economicAmount('15.000000', 1),
      budget: economicAmount(),
      variance: '5.000000',
      interventionIds: [REPORT_OTHER_INTERVENTION_ID],
    },
  ];
  return {
    '@id': '/api/organizations/org/maintenance-cost/reports',
    '@type': 'MaintenanceEconomicReport',
    id: 'org',
    organizationId: 'org',
    from: '2025-01-01',
    to: '2025-01-31',
    groupBy: 'equipment',
    currency: 'EUR',
    page: 1,
    itemsPerPage: 30,
    totalItems: 2,
    interventionCount: 2,
    publishedInterventionCount: 2,
    liveInterventionCount: 0,
    missingSnapshotCount: 0,
    rows,
    dossiers: [
      {
        id: REPORT_INTERVENTION_ID,
        number: 1,
        name: 'Entrance repair',
        status: 'published',
        snapshotState: 'available',
      },
      {
        id: REPORT_OTHER_INTERVENTION_ID,
        number: 2,
        name: 'Hall repair',
        status: 'published',
        snapshotState: 'available',
      },
    ],
    unallocated: {
      id: null,
      name: null,
      identityState: 'unallocated',
      allocationComplete: false,
      current: economicAmount('5.000000', 1),
      frozen: economicAmount(),
      planned: economicAmount(),
      budget,
      variance: null,
      interventionIds: [REPORT_INTERVENTION_ID],
    },
    current,
    frozen,
    planned,
    budget,
    variance: '11.000000',
    reconciliation: {
      sourceCurrent: current,
      excludedCurrent: economicAmount(),
      sourceFrozen: frozen,
      excludedFrozen: economicAmount(),
      sourcePlanned: planned,
      excludedPlanned: economicAmount(),
      reconciled: true,
    },
    procurement: {
      organizationId: 'org',
      currency: 'EUR',
      from: '2025-01-01T00:00:00Z',
      to: '2025-02-01T00:00:00Z',
      basis: 'order_created_at',
      receiptScope: 'selected_orders_all_history',
      orderCount: 1,
      receiptCount: 2,
      pendingIndividualizationCount: 1,
      ordered: { total: '40.000000', knownTotal: '40.000000', complete: true },
      received: { total: '30.000000', knownTotal: '30.000000', complete: true },
      outstanding: { total: '10.000000', knownTotal: '10.000000', complete: true },
      returned: { total: '5.000000', knownTotal: '5.000000', complete: true },
    },
    ...overrides,
  };
}
