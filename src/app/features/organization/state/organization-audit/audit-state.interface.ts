import type { CallState } from '@core/state/request-state';
import type { AuditEventListOptions } from '@features/organization/models';

export interface AuditState {
  readonly totalAuditEvents: number;
  readonly activeFilters: AuditEventListOptions | null;
  readonly listCallState: CallState;
}
