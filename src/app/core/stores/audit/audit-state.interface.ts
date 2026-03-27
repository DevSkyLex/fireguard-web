import type { AuditEventListOptions, AuditEventOutput } from '@core/models/audit';
import type { CollectionOperation } from '../operations';

export interface AuditState {
  readonly totalAuditEvents: number;
  readonly activeFilters: AuditEventListOptions | null;
  readonly listOperation: CollectionOperation<AuditEventOutput, unknown>;
}
