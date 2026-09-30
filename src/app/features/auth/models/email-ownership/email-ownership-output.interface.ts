import type { HydraItem } from '@core/api/models';

/**
 * Interface EmailOwnershipOutput
 * @interface EmailOwnershipOutput
 *
 * @description
 * Server-attested mailbox possession, separate from federated profile verification.
 *
 * @since 1.0.0
 */
export interface EmailOwnershipOutput extends HydraItem {
  /**
   * Property verified
   *
   * @description
   * Records whether the server confirmed mailbox possession for this proof flow.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  verified: boolean;
}
