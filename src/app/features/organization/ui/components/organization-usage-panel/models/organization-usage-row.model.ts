import type { QuotaStatusTagDescriptor } from './quota-status-tag/quota-status-tag-descriptor.interface';

/**
 * Interface OrganizationUsageRow
 *
 * @description
 * A quota usage item joined with its label, resolved status descriptor and
 * meter percentage, ready for one meter row. `percent` is `null` for an
 * unlimited resource, which renders no bar.
 *
 * @since 1.0.0
 */
export interface OrganizationUsageRow {
  /**
   * Property resource
   *
   * @description Stable quota resource key supplied by the API.
   * @type {string}
   */
  readonly resource: string;

  /**
   * Property label
   *
   * @description Human-readable name for the metered resource.
   * @type {string}
   */
  readonly label: string;

  /**
   * Property description
   *
   * @description Explanation of what is counted against this quota.
   * @type {string}
   */
  readonly description: string;

  /**
   * Property used
   *
   * @description Number of resource units currently consumed.
   * @type {number}
   */
  readonly used: number;

  /**
   * Property limit
   *
   * @description Plan allowance, or `null` when the resource is unlimited.
   * @type {number | null}
   */
  readonly limit: number | null;

  /**
   * Property percent
   *
   * @description Bounded meter percentage, or `null` when no limit applies.
   * @type {number | null}
   */
  readonly percent: number | null;

  /**
   * Property remaining
   *
   * @description Available units before the limit, or `null` for an unlimited quota.
   * @type {number | null}
   */
  readonly remaining: number | null;

  /**
   * Property status
   *
   * @description Semantic state used by the quota status tag.
   * @type {QuotaStatusTagDescriptor}
   */
  readonly status: QuotaStatusTagDescriptor;
}
