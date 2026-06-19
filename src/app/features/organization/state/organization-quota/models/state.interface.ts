import type { CallState } from '@core/state/request-state';
import type { OrganizationQuotaOutput } from '@features/organization/models';

/**
 * Interface OrganizationQuotaState
 * @interface OrganizationQuotaState
 *
 * @description
 * State for the active organization's quota usage, backing the usage meters in
 * the organization context sidebar.
 */
export interface OrganizationQuotaState {
  /** Identifier of the organization the quota payload belongs to. */
  readonly currentOrganizationId: string | null;

  /** Async state for loading the quota usage payload. */
  readonly quotaCallState: CallState<OrganizationQuotaOutput>;
}
