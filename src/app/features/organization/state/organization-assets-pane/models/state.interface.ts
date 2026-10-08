import type { CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  InspectionOutput,
  NonConformityOutput,
} from '@features/organization/features/inspections/models';

/**
 * Interface OrganizationAssetsPaneState
 * @interface OrganizationAssetsPaneState
 *
 * @description
 * State of the assets explorer's right pane: the equipment and inspections
 * for whatever the left tree currently scopes the view to — one facility, or
 * the whole organization on the "everything" axis.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationAssetsPaneState {
  /**
   * Property anomaliesPage
   * @readonly
   *
   * @description
   * Server page of the unresolved anomaly register.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly anomaliesPage: number;
  /**
   * Property anomaliesTotal
   * @readonly
   *
   * @description
   * Exact filtered anomaly count across all server pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly anomaliesTotal: number;
  /**
   * Property anomaliesScope
   * @readonly
   *
   * @description
   * Scope fingerprint cancels and clears obsolete client/family/site results.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly anomaliesScope: string;
  /**
   * Property anomaliesCallState
   * @readonly
   *
   * @description
   * Independent list lifecycle; unknown is distinct from a verified empty register.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<readonly NonConformityOutput[]>}
   */
  readonly anomaliesCallState: CallState<readonly NonConformityOutput[]>;

  /**
   * Property equipmentPage
   * @readonly
   *
   * @description
   * Current page number for the equipment pane.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly equipmentPage: number;

  /**
   * Property equipmentTotal
   * @readonly
   *
   * @description
   * Total equipment rows reported for the active equipment query.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly equipmentTotal: number;

  /**
   * Property equipmentScope
   * @readonly
   *
   * @description
   * Stable scope key used to reset equipment paging when filters change.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly equipmentScope: string;

  /**
   * Property inspectionPage
   * @readonly
   *
   * @description
   * Current page number for the inspections pane.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly inspectionPage: number;

  /**
   * Property inspectionTotal
   * @readonly
   *
   * @description
   * Total inspection rows reported for the active inspection query.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly inspectionTotal: number;

  /**
   * Property inspectionScope
   * @readonly
   *
   * @description
   * Stable scope key used to reset inspection paging when filters change.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly inspectionScope: string;
  //#region Properties
  /**
   * Property equipmentListCallState
   * @readonly
   *
   * @description
   * The equipment currently in view.
   *
   * @type {CallState<readonly EquipmentOutput[]>}
   */
  readonly equipmentListCallState: CallState<readonly EquipmentOutput[]>;

  /**
   * Property inspectionListCallState
   * @readonly
   *
   * @description
   * The inspections currently in view.
   *
   * @type {CallState<readonly InspectionOutput[]>}
   */
  readonly inspectionListCallState: CallState<readonly InspectionOutput[]>;
  //#endregion
}
