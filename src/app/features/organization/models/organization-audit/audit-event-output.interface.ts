import type { HydraItem } from '@core/api/models';

/**
 * Interface AuditEventOutput
 *
 * @description
 * Read model returned by audit event endpoints.
 */
export interface AuditEventOutput extends HydraItem {
  readonly id: string;
  readonly action: string;
  readonly actorType: string;
  readonly actorId?: string | null;
  readonly actorEmail?: string | null;
  readonly actorEmailHash?: string | null;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
  readonly clientId?: string | null;
  readonly tenantId?: string | null;
  readonly ipAddress?: string | null;
  readonly ipHash?: string | null;
  readonly userAgent?: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly chainId: string;
  readonly sequence: number;
  readonly prevHash?: string | null;
  readonly eventHash: string;
}
