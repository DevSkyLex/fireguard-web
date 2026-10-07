import type { CallState } from '@core/request-state';
import type {
  MaintenanceEconomicReportOutput,
  MaintenanceFinancialDirectoryQuery,
  MaintenanceReportQuery,
} from '@features/organization/features/maintenance-costs/models';

/**
 * Interface MaintenanceReportScope
 * @interface MaintenanceReportScope
 *
 * @description
 * Credential-free display boundary; private replies never populate another account or organization.
 */
export interface MaintenanceReportScope {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Authorized owning organization identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property sessionRevision
   * @readonly
   *
   * @description
   * Current authenticated account-session generation.
   *
   * @access public
   *
   * @type {number}
   */
  readonly sessionRevision: number;
}

/**
 * Interface MaintenanceReportState
 * @interface MaintenanceReportState
 *
 * @description
 * Independent private report and named directory queries with explicit request state.
 */
export interface MaintenanceReportState {
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Current authorized browser scope, never serialized into SSR.
   *
   * @access public
   *
   * @type {MaintenanceReportScope | null}
   */
  readonly scope: MaintenanceReportScope | null;

  /**
   * Property scopeVersion
   * @readonly
   *
   * @description
   * Monotonic local invalidation generation.
   *
   * @access public
   *
   * @type {number}
   */
  readonly scopeVersion: number;

  /**
   * Property reportQuery
   * @readonly
   *
   * @description
   * Requested bounded report page and filters.
   *
   * @access public
   *
   * @type {MaintenanceReportQuery | null}
   */
  readonly reportQuery: MaintenanceReportQuery | null;

  /**
   * Property reportCallState
   * @readonly
   *
   * @description
   * Report request lifecycle; a changed scope never labels prior totals as current results.
   *
   * @access public
   *
   * @type {CallState<MaintenanceEconomicReportOutput>}
   */
  readonly reportCallState: CallState<MaintenanceEconomicReportOutput>;

  /**
   * Property directoryQuery
   * @readonly
   *
   * @description
   * Requested named source directory page.
   *
   * @access public
   *
   * @type {MaintenanceFinancialDirectoryQuery | null}
   */
  readonly directoryQuery: MaintenanceFinancialDirectoryQuery | null;

  /**
   * Property directoryCallState
   * @readonly
   *
   * @description
   * Independent directory lifecycle without duplicated entity data.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly directoryCallState: CallState;

  /**
   * Property directoryTotal
   * @readonly
   *
   * @description
   * Server-wide directory count for the active filters.
   *
   * @access public
   *
   * @type {number}
   */
  readonly directoryTotal: number;
}
