import type { HydraItem } from '@core/api/models';
/**
 * Interface EmailOwnershipOutput
 * @interface EmailOwnershipOutput
 * @description Server-attested mailbox possession, separate from federated profile verification.
 * @since 1.0.0
 */
export interface EmailOwnershipOutput extends HydraItem {
  verified: boolean;
}
