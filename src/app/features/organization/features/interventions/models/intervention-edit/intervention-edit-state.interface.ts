import type { InterventionEditTarget } from './intervention-edit-target.type';

/**
 * Interface InterventionEditState
 * @interface
 *
 * @description
 * Which in-place field is open, writing, or showing a rejection.
 * The page owns all four, so "one field open at a time" is structural, a
 * readiness item can open an editor it does not contain, and the store's single
 * shared mutation flag can be attributed to the one field that caused it.
 */
export interface InterventionEditState {
  /**
   * Property open
   * @readonly
   *
   * @description
   * Identifies the record currently being edited, when one exists.
   *
   * @access public
   *
   * @type {InterventionEditTarget | null}
   */
  readonly open: InterventionEditTarget | null;

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Identifies the record whose changes are currently being saved, when one exists.
   *
   * @access public
   *
   * @type {InterventionEditTarget | null}
   */
  readonly saving: InterventionEditTarget | null;

  /**
   * Property failed
   * @readonly
   *
   * @description
   * Identifies the record whose latest save failed, when one exists.
   *
   * @access public
   *
   * @type {InterventionEditTarget | null}
   */
  readonly failed: InterventionEditTarget | null;

  /**
   * Property failure
   * @readonly
   *
   * @description
   * Contains the normalized error from the latest edit operation, when one exists.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly failure: string | null;
}
