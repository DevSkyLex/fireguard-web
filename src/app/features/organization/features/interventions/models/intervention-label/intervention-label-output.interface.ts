import type { HydraItem } from '@core/api/models';

/**
 * Interface InterventionLabelOutput
 * @interface InterventionLabelOutput
 *
 * @description
 * Organization-scoped intervention label resource returned by the API.
 */
export interface InterventionLabelOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the label.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organization
   * @readonly
   *
   * @description
   * IRI of the organization owning the label.
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Label display name, unique within the organization.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Label colour as a `#rrggbb` hex string.
   *
   * @type {string}
   */
  readonly color: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * ISO-8601 creation timestamp.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * ISO-8601 last update timestamp.
   *
   * @type {string}
   */
  readonly updatedAt: string;
  //#endregion
}
