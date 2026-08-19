import type { HydraItem } from '@core/api/models';
import type { AuditActorType } from './audit-actor-type.type';

/**
 * Interface AuditEventOutput
 * @interface AuditEventOutput
 *
 * @description
 * One organization audit entry, mirroring the backend
 * `OrganizationAuditEventOutput` DTO byte for byte. `action` is a raw
 * `module.snake_case` string — the backend ships no catalog endpoint, so a
 * value outside the frontend's own presentation registry must still render
 * (see `resolveAuditActionTag`). `metadata` is always an object, a
 * per-action allowlisted projection, never `null`. API Platform omits an
 * absent optional field entirely rather than serializing it as `null`, so
 * every optional property here is read as possibly `undefined`, never
 * `=== null`.
 *
 * @since 1.0.0
 */
export interface AuditEventOutput extends HydraItem {
  /** @type {string} */
  readonly id: string;

  /** Raw `module.snake_case` action id. @type {string} */
  readonly action: string;

  /** @type {AuditActorType} */
  readonly actorType: AuditActorType;

  /** Bare id of the acting user, client or system process. @type {string | undefined} */
  readonly actorId?: string;

  /**
   * Resolved only for `'user'` actors who are members of this organization,
   * including deactivated ones. Absent for every other actor type and for a
   * user actor no longer resolvable in this organization's directory.
   *
   * @type {string | undefined}
   */
  readonly actorDisplayName?: string;

  /** Bare concept name of the audited entity, e.g. `'facility'`. @type {string | undefined} */
  readonly subjectType?: string;

  /** Bare id of the audited entity. @type {string | undefined} */
  readonly subjectId?: string;

  /** Per-action allowlisted projection — ids, enums, booleans and counts only, never free text or PII. @type {Record<string, unknown>} */
  readonly metadata: Record<string, unknown>;

  /** When the action actually happened. @type {string} */
  readonly occurredAt: string;

  /** When the entry was durably recorded, usually equal to {@link occurredAt}. @type {string} */
  readonly recordedAt: string;
}
