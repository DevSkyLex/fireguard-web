import type { InterventionWorkItemAction } from '../intervention-work-item/intervention-work-item-action.type';

/**
 * Interface InterventionEquipmentContext
 * @interface InterventionEquipmentContext
 *
 * @description
 * Validated preparation context passed by the equipment dossier, never an API authorization.
 */
export interface InterventionEquipmentContext {
  /**
   * Property target
   * @readonly
   *
   * @description
   * Canonical equipment IRI to prepare in the work-item form.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly target: string;

  /**
   * Property action
   * @readonly
   *
   * @description
   * Equipment operation the planner will confirm.
   *
   * @access public
   * @since unreleased
   *
   * @type {InterventionWorkItemAction}
   */
  readonly action: InterventionWorkItemAction;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Optional root-site IRI supplied by the equipment dossier.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly site: string;
}
