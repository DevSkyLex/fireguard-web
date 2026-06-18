/**
 * Interface InterventionWorkItemTarget
 * @interface InterventionWorkItemTarget
 *
 * @description
 * Read-only target summary embedded on a work item output, resolved by the API
 * from the target reference (linked facility or equipment). Lets the UI render
 * the label, and an icon by kind, without loading the full target option list.
 */
export interface InterventionWorkItemTarget {
  /**
   * Property resource
   * @readonly
   *
   * @description
   * Target IRI (echoes the work item `target`).
   *
   * @type {string}
   */
  readonly resource: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Target resource kind.
   *
   * @type {'facility' | 'equipment'}
   */
  readonly kind: 'facility' | 'equipment';

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable target label ready for display.
   *
   * @type {string}
   */
  readonly label: string;
}
