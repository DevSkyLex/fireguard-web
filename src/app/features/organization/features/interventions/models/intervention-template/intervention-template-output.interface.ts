import type { HydraItem } from '@core/api/models';
import type { InterventionPriority } from '../intervention/intervention-priority.type';
import type { InterventionType } from '../intervention/intervention-type.type';
import type { InterventionTemplateItemOutput } from './intervention-template-item-output.interface';

/**
 * Interface InterventionTemplateOutput
 * @interface InterventionTemplateOutput
 *
 * @description
 * Organization-scoped intervention template resource returned by the API — a
 * reusable blueprint (type, priority, defaults, planned items) instantiated
 * into a real intervention draft.
 */
export interface InterventionTemplateOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the template.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organization
   * @readonly
   *
   * @description
   * IRI of the organization owning the template.
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Template display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional free-text template description.
   *
   * @type {string | null}
   */
  readonly description: string | null;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Intervention type applied to a draft instantiated from this template.
   *
   * @type {InterventionType}
   */
  readonly type: InterventionType;

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Intervention priority applied to a draft instantiated from this template.
   *
   * @type {InterventionPriority}
   */
  readonly priority: InterventionPriority;

  /**
   * Property defaultSite
   * @readonly
   *
   * @description
   * Optional IRI of the site pre-filled at instantiation, unless overridden.
   *
   * @type {string | null}
   */
  readonly defaultSite: string | null;

  /**
   * Property defaultResponsible
   * @readonly
   *
   * @description
   * Optional IRI of the responsible member pre-filled at instantiation,
   * unless overridden.
   *
   * @type {string | null}
   */
  readonly defaultResponsible: string | null;

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Optional ISO-8601 duration (e.g. `P14D`) used to derive `dueAt` from
   * `plannedStartAt` at instantiation.
   *
   * @type {string | null}
   */
  readonly duration: string | null;

  /**
   * Property labelIds
   * @readonly
   *
   * @description
   * Identifiers of the intervention labels applied at instantiation.
   *
   * @type {readonly string[]}
   */
  readonly labelIds: readonly string[];

  /**
   * Property items
   * @readonly
   *
   * @description
   * Planned work items materialized on the instantiated intervention.
   *
   * @type {readonly InterventionTemplateItemOutput[]}
   */
  readonly items: readonly InterventionTemplateItemOutput[];

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
