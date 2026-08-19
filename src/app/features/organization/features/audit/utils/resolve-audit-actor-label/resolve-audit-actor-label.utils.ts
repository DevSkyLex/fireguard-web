import type { AuditActorType } from '@features/organization/features/audit/models';

/** Localized neutral fallback per actor type, shown whenever `actorDisplayName` is absent. */
const AUDIT_ACTOR_FALLBACK: Record<AuditActorType, string> = {
  user: $localize`:@@audit.actor.unknownMember:Unknown member`,
  client: $localize`:@@audit.actor.client:API client`,
  system: $localize`:@@audit.actor.system:System`,
  anonymous: $localize`:@@audit.actor.anonymous:Anonymous`,
};

/**
 * Function resolveAuditActorLabel
 *
 * @description
 * Resolves the label an audit row renders for its actor. The backend only
 * ever resolves `actorDisplayName` for a `'user'` actor who is a member of
 * this organization (including a deactivated one) and sends no placeholder
 * otherwise — every other case renders a neutral, localized fallback keyed
 * on {@link AuditActorType} rather than a blank cell.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {AuditActorType} actorType - The event's actor type.
 * @param {string} [actorDisplayName] - The resolved display name, when the backend sent one.
 *
 * @returns {string} The name to render.
 */
export function resolveAuditActorLabel(
  actorType: AuditActorType,
  actorDisplayName?: string,
): string {
  return actorDisplayName && actorDisplayName.length > 0
    ? actorDisplayName
    : AUDIT_ACTOR_FALLBACK[actorType];
}
