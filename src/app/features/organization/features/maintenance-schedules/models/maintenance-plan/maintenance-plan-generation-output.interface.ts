/**
 * Interface MaintenancePlanGenerationOutput
 * @interface MaintenancePlanGenerationOutput
 *
 * @description
 * Bounded work creation or recovery for one equipment operation.
 */
export interface MaintenancePlanGenerationOutput {
  /**
   * Property occurrenceId
   * @readonly
   *
   * @description
   * Stable due occurrence.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly occurrenceId: string;
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Created or recovered work identity.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly interventionId: string;
  /**
   * Property number
   * @readonly
   *
   * @description
   * Human-readable work number.
   *
   * @since unreleased
   *
   * @type {number}
   */
  readonly number: number;
  /**
   * Property workItemsCount
   * @readonly
   *
   * @description
   * Server-reported work size.
   *
   * @since unreleased
   *
   * @type {number}
   */
  readonly workItemsCount: number;
  /**
   * Property replayed
   * @readonly
   *
   * @description
   * Indicates reuse of already-created work.
   *
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly replayed: boolean;
}
