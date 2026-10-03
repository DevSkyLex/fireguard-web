import type { CallState } from '@core/request-state';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import type { EquipmentSelectOption } from '@features/organization/features/inspections/models';

/**
 * Interface InspectionCreationOptionsState
 * @interface InspectionCreationOptionsState
 *
 * @description
 * State consumed by the inspection creation form's equipment picker.
 *
 * @since 1.0.0
 */
export interface InspectionCreationOptionsState {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization owning both option queries.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property equipmentPage
   * @readonly
   *
   * @description
   * Current one-based server page of equipment choices.
   *
   * @access public
   *
   * @type {number}
   */
  readonly equipmentPage: number;

  /**
   * Property equipmentTotal
   * @readonly
   *
   * @description
   * Total equipment matching the server search.
   *
   * @access public
   *
   * @type {number}
   */
  readonly equipmentTotal: number;

  /**
   * Property equipmentSearch
   * @readonly
   *
   * @description
   * Search applied to the equipment query.
   *
   * @access public
   *
   * @type {string}
   */
  readonly equipmentSearch: string;

  /**
   * Property checklists
   * @readonly
   *
   * @description
   * Current server page of active checklist choices.
   *
   * @access public
   *
   * @type {readonly ChecklistOutput[]}
   */
  readonly checklists: readonly ChecklistOutput[];

  /**
   * Property checklistPage
   * @readonly
   *
   * @description
   * Current one-based server page of active checklist choices.
   *
   * @access public
   *
   * @type {number}
   */
  readonly checklistPage: number;

  /**
   * Property checklistTotal
   * @readonly
   *
   * @description
   * Total active checklists matching the server search.
   *
   * @access public
   *
   * @type {number}
   */
  readonly checklistTotal: number;

  /**
   * Property checklistSearch
   * @readonly
   *
   * @description
   * Search applied to the checklist query.
   *
   * @access public
   *
   * @type {string}
   */
  readonly checklistSearch: string;

  /**
   * Property checklistCallState
   * @readonly
   *
   * @description
   * Independent request lifecycle for active checklist choices.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly checklistCallState: CallState;

  /**
   * Property equipmentOptions
   *
   * @description
   * The organization's equipment, offered by `InspectionCreateForm`'s combobox.
   */
  readonly equipmentOptions: readonly EquipmentSelectOption[];

  /**
   * Property loadCallState
   *
   * @description
   * Lifecycle of the options load (pending / success / error).
   */
  readonly loadCallState: CallState;
}
