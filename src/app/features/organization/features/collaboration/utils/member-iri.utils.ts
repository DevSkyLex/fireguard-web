import type { CurrentOrganizationMemberProfileOutput } from '@features/organization/models';

/**
 * Function memberIriOf
 * @function memberIriOf
 *
 * @description
 * Builds the organization-member IRI a message identifies its author by.
 *
 * Built rather than read: the profile endpoint answers with a bare id, messages
 * carry the IRI, and there is no route to translate one into the other — so
 * comparing "did I write this?" means assembling the IRI on this side.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {CurrentOrganizationMemberProfileOutput | null} profile - The reader's member profile.
 *
 * @returns {string | null} The IRI, or `null` when there is no profile to build it from.
 *
 * @example
 * ```typescript
 * memberIriOf(profile); // '/api/organizations/org-1/members/member-1'
 * ```
 */
export function memberIriOf(profile: CurrentOrganizationMemberProfileOutput | null): string | null {
  if (profile === null) return null;

  return `/api/organizations/${profile.organizationId}/members/${profile.id}`;
}
