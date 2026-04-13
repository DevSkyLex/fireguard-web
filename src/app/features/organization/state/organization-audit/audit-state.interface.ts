import type { AuditEventListOptions, AuditEventOutput } from '@features/organization/models';
import type { CallState } from '@core/state/request-state';

export interface AuditState {
  readonly totalAuditEvents: number;
  readonly activeFilters: AuditEventListOptions | null;
  readonly listCallState: CallState;
}
