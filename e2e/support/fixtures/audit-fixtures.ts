/**
 * Audit-event transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the organization audit journal. Plain factory
 * function (like `equipment-fixtures.ts`), so tests override fields via
 * object spread.
 */

export const E2E_AUDIT_EVENT_ID = 'e2e-audit-1';

export interface AuditEventOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly action: string;
  readonly actorType: 'user' | 'client' | 'system' | 'anonymous';
  readonly actorId?: string;
  readonly actorDisplayName?: string;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: string;
  readonly recordedAt: string;
}

/** An "organization created" entry, actioned by a resolvable member. */
export function auditEventOutput(
  overrides: Partial<AuditEventOutputFixture> = {},
): AuditEventOutputFixture {
  return {
    '@id': `/api/audit-events/${E2E_AUDIT_EVENT_ID}`,
    '@type': 'AuditEvent',
    id: E2E_AUDIT_EVENT_ID,
    action: 'organization.created',
    actorType: 'user',
    actorId: 'e2e-user-1',
    actorDisplayName: 'Jamie Rivera',
    metadata: {},
    occurredAt: '2026-08-01T09:00:00+00:00',
    recordedAt: '2026-08-01T09:00:00+00:00',
    ...overrides,
  };
}
