import type { MemberSelectOption } from '@features/organization/features/interventions/models';

/**
 * Function resolveInterventionActivityActor
 *
 * @description
 * Resolves an activity entry's actor IRI against the loaded member options.
 * Shared by the detail page's meta line and the activity thread — the two
 * consumers that justify lifting this to the feature level.
 *
 * `actor` is `null` for system entries with no attributable author, and an
 * IRI can also point at a member no longer in the loaded set (left the
 * organization) — both resolve to `null`, so the caller renders a neutral
 * fallback rather than nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string | null} actor - The activity entry's actor IRI, or null.
 * @param {readonly MemberSelectOption[]} members - The organization's loaded members.
 *
 * @returns {MemberSelectOption | null} The matching member, or null.
 */
export function resolveInterventionActivityActor(
  actor: string | null,
  members: readonly MemberSelectOption[],
): MemberSelectOption | null {
  if (actor === null) return null;

  return members.find((member) => member.value === actor) ?? null;
}
