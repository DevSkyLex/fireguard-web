import type { InterventionChangeRowViewModel } from './intervention-change-row-view-model.interface';
/**
 * Interface InterventionChangeGroup
 * @interface InterventionChangeGroup
 * @description Changes concerning one identifiable resource.
 * @since 1.0.0
 */
export interface InterventionChangeGroup {
  /**
   * Property resource
   * @readonly
   * @description Resource IRI used as stable identity.
   * @since 1.0.0
   * @type {string}
   */
  readonly resource: string;
  /**
   * Property label
   * @readonly
   * @description Human-readable resource label.
   * @since 1.0.0
   * @type {string}
   */
  readonly label: string;
  /**
   * Property rows
   * @readonly
   * @description Changes in the selected state.
   * @since 1.0.0
   * @type {readonly InterventionChangeRowViewModel[]}
   */
  readonly rows: readonly InterventionChangeRowViewModel[];
}
