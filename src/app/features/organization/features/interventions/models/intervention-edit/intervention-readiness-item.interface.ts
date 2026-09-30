import type { InterventionReadinessTarget } from './intervention-readiness-target.type';

/**
 * Interface InterventionReadinessItem
 * @interface
 *
 * @description
 * One prerequisite on the way to the next phase, and where to go to satisfy it.
 * The label is already localized by the page, so the checklist renders it
 * without knowing which phase produced it.
 */
export interface InterventionReadinessItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this intervention readiness item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this intervention readiness item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property done
   * @readonly
   *
   * @description
   * Indicates whether this work item is complete.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly done: boolean;

  /**
   * Property target
   * @readonly
   *
   * @description
   * Identifies the selected target for this work item.
   *
   * @access public
   *
   * @type {InterventionReadinessTarget}
   */
  readonly target: InterventionReadinessTarget;
}
