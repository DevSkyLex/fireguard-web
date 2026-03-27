import type { PaginationOptions } from '@core/models/api';

/**
 * Interface AuditEventListOptions
 *
 * @description
 * Supported filters for audit event collection endpoints.
 */
export interface AuditEventListOptions extends PaginationOptions {
  readonly action?: string;
  readonly actorType?: string;
  readonly actorId?: string;
  readonly actorEmailHash?: string;
  readonly subjectType?: string;
  readonly subjectId?: string;
  readonly clientId?: string;
  readonly tenantId?: string;
  readonly ipHash?: string;
  readonly from?: string;
  readonly to?: string;
}
