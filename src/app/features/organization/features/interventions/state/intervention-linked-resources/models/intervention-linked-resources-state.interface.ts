import type { CallState } from '@core/request-state';
import type {
  EquipmentOutput,
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import type {
  FacilityOutput,
  FacilityStatus,
  FacilityType,
} from '@features/organization/features/facilities/models';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import type { InterventionTableSource } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionLinkedResourcesState
 * @interface InterventionLinkedResourcesState
 *
 * @description
 * State backing three independently loaded linked-resource tables per intervention.
 *
 * @since 6.2.0
 */
export interface InterventionLinkedResourcesState {
  /**
   * Property online
   * @readonly
   *
   * @description
   * Indicates whether the linked-resource view can issue online requests.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly online: boolean;

  /**
   * Property activeResource
   * @readonly
   *
   * @description
   * Selects the linked-resource collection currently displayed.
   *
   * @access public
   *
   * @type {'facilities' | 'equipment' | 'inspections' | null}
   */
  readonly activeResource: 'facilities' | 'equipment' | 'inspections' | null;

  /**
   * Property facilitiesSource
   * @readonly
   *
   * @description
   * Identifies the source of the current facility rows.
   *
   * @access public
   *
   * @type {InterventionTableSource}
   */
  readonly facilitiesSource: InterventionTableSource;

  /**
   * Property facilitiesGeneration
   * @readonly
   *
   * @description
   * Fences stale facility responses from replacing newer query state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly facilitiesGeneration: number;

  /**
   * Property facilitiesInvalidated
   * @readonly
   *
   * @description
   * Indicates whether facility rows need to be refreshed.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly facilitiesInvalidated: boolean;

  /**
   * Property facilitiesFailedPage
   * @readonly
   *
   * @description
   * Identifies the facility page whose latest request failed, when one exists.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly facilitiesFailedPage: number | null;

  /**
   * Property equipmentGeneration
   * @readonly
   *
   * @description
   * Fences stale equipment responses from replacing newer query state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly equipmentGeneration: number;

  /**
   * Property equipmentSource
   * @readonly
   *
   * @description
   * Identifies the source of the current equipment rows.
   *
   * @access public
   *
   * @type {InterventionTableSource}
   */
  readonly equipmentSource: InterventionTableSource;

  /**
   * Property equipmentInvalidated
   * @readonly
   *
   * @description
   * Indicates whether equipment rows need to be refreshed.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly equipmentInvalidated: boolean;

  /**
   * Property equipmentFailedPage
   * @readonly
   *
   * @description
   * Identifies the equipment page whose latest request failed, when one exists.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly equipmentFailedPage: number | null;

  /**
   * Property inspectionsGeneration
   * @readonly
   *
   * @description
   * Fences stale inspection responses from replacing newer query state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly inspectionsGeneration: number;

  /**
   * Property inspectionsSource
   * @readonly
   *
   * @description
   * Stores the current page, page size, and search criteria for the inspection table.
   *
   * @access public
   *
   * @type {InterventionTableSource}
   */
  readonly inspectionsSource: InterventionTableSource;

  /**
   * Property inspectionsInvalidated
   * @readonly
   *
   * @description
   * Indicates whether inspection rows need to be refreshed.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly inspectionsInvalidated: boolean;

  /**
   * Property inspectionsFailedPage
   * @readonly
   *
   * @description
   * Identifies the inspection page whose latest request failed, when one exists.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly inspectionsFailedPage: number | null;

  /**
   * Property loadedForInterventionId
   * @readonly
   *
   * @description
   * any tab has ever loaded. A mismatch against the requested intervention
   * id is what drives the three call states back to idle on prev/next
   * navigation.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly loadedForInterventionId: string | null;

  /**
   * Property facilitiesCallState
   * @readonly
   *
   * @description
   * Lifecycle of the linked-facilities fetch.
   *
   * @access public
   *
   * @type {CallState<readonly FacilityOutput[]>}
   */
  readonly facilitiesCallState: CallState<readonly FacilityOutput[]>;

  /**
   * Property facilitiesRecordStatus
   * @readonly
   *
   * @description
   * with, carried across `loadMoreFacilities`' pagination — `undefined`
   * leaves the canonical provider's own `'draft'` default in place.
   * `ensureFacilitiesLoaded`/`reloadFacilities` overwrite it on every call
   * so a status change (e.g. the intervention just published) is what a
   * later page continues from.
   *
   * @access public
   *
   * @type {FacilityOutput['recordStatus']}
   */
  readonly facilitiesRecordStatus: FacilityOutput['recordStatus'];

  /**
   * Property facilitiesPage
   * @readonly
   *
   * @description
   * One-based page of linked facilities currently loaded.
   *
   * @access public
   *
   * @type {number}
   */
  readonly facilitiesPage: number;

  /**
   * Property facilitiesTotalItems
   * @readonly
   *
   * @description
   * Total linked facilities reported by the server, across all pages.
   *
   * @access public
   *
   * @type {number}
   */
  readonly facilitiesTotalItems: number;

  /**
   * Property facilitiesLoadingMore
   * @readonly
   *
   * @description
   * Whether an additional page of linked facilities is being fetched.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly facilitiesLoadingMore: boolean;

  /**
   * Property facilitiesSearch
   * @readonly
   *
   * @description
   * Contains the text used to filter facilities.
   *
   * @access public
   *
   * @type {string}
   */
  readonly facilitiesSearch: string;

  /**
   * Property facilitiesType
   * @readonly
   *
   * @description
   * Filters facilities by facility type.
   *
   * @access public
   *
   * @type {FacilityType | null}
   */
  readonly facilitiesType: FacilityType | null;

  /**
   * Property facilitiesStatus
   * @readonly
   *
   * @description
   * Filters facilities by facility status.
   *
   * @access public
   *
   * @type {FacilityStatus | null}
   */
  readonly facilitiesStatus: FacilityStatus | null;

  /**
   * Property equipmentCallState
   * @readonly
   *
   * @description
   * Lifecycle of the linked-equipment fetch.
   *
   * @access public
   *
   * @type {CallState<readonly EquipmentOutput[]>}
   */
  readonly equipmentCallState: CallState<readonly EquipmentOutput[]>;

  /**
   * Property equipmentPage
   * @readonly
   *
   * @description
   * One-based page of linked equipment currently loaded.
   *
   * @access public
   *
   * @type {number}
   */
  readonly equipmentPage: number;

  /**
   * Property equipmentTotalItems
   * @readonly
   *
   * @description
   * Total linked equipment reported by the server, across all pages.
   *
   * @access public
   *
   * @type {number}
   */
  readonly equipmentTotalItems: number;

  /**
   * Property equipmentLoadingMore
   * @readonly
   *
   * @description
   * Whether an additional page of linked equipment is being fetched.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly equipmentLoadingMore: boolean;

  /**
   * Property equipmentSearch
   * @readonly
   *
   * @description
   * Contains the text used to filter equipment.
   *
   * @access public
   *
   * @type {string}
   */
  readonly equipmentSearch: string;

  /**
   * Property equipmentType
   * @readonly
   *
   * @description
   * Filters maintenance schedules to the selected equipment type.
   *
   * @access public
   *
   * @type {EquipmentType | null}
   */
  readonly equipmentType: EquipmentType | null;

  /**
   * Property equipmentStatus
   * @readonly
   *
   * @description
   * Filters equipment by equipment status.
   *
   * @access public
   *
   * @type {EquipmentStatus | null}
   */
  readonly equipmentStatus: EquipmentStatus | null;

  /**
   * Property inspectionsCallState
   * @readonly
   *
   * @description
   * Lifecycle of the linked-inspections fetch.
   *
   * @access public
   *
   * @type {CallState<readonly InspectionOutput[]>}
   */
  readonly inspectionsCallState: CallState<readonly InspectionOutput[]>;

  /**
   * Property inspectionsPage
   * @readonly
   *
   * @description
   * One-based page of linked inspections currently loaded.
   *
   * @access public
   *
   * @type {number}
   */
  readonly inspectionsPage: number;

  /**
   * Property inspectionsTotalItems
   * @readonly
   *
   * @description
   * Total linked inspections reported by the server, across all pages.
   *
   * @access public
   *
   * @type {number}
   */
  readonly inspectionsTotalItems: number;

  /**
   * Property inspectionsLoadingMore
   * @readonly
   *
   * @description
   * Whether an additional page of linked inspections is being fetched.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly inspectionsLoadingMore: boolean;

  /**
   * Property inspectionsSearch
   * @readonly
   *
   * @description
   * Contains the text used to filter inspections.
   *
   * @access public
   *
   * @type {string}
   */
  readonly inspectionsSearch: string;

  /**
   * Property inspectionsStatus
   * @readonly
   *
   * @description
   * Filters inspections by inspection status.
   *
   * @access public
   *
   * @type {InspectionStatus | null}
   */
  readonly inspectionsStatus: InspectionStatus | null;

  /**
   * Property inspectionsResult
   * @readonly
   *
   * @description
   * Filters inspections by result when a result is selected.
   *
   * @access public
   *
   * @type {InspectionResult | null}
   */
  readonly inspectionsResult: InspectionResult | null;
}
