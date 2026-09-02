import type { MemberSelectOption, OrganizationMemberOutput } from '@features/organization/models';

/**
 * Function toMemberSelectOption
 * @function toMemberSelectOption
 *
 * @description
 * Maps a raw organization member to the option every member picker renders
 * through `app-person-option`: display name (falling back to the first/last
 * pair, then the user id), initials, avatar and the joined role names. The
 * submitted `value` defaults to the member IRI the intervention endpoints
 * take; a caller whose endpoint wants the member id or the user id passes
 * it explicitly. Pure.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {OrganizationMemberOutput} member - Raw organization member.
 * @param {string} organizationId - Organization owning the member, for the default IRI.
 * @param {string} [value] - What a form submits; defaults to the member IRI.
 *
 * @returns {MemberSelectOption} The picker option.
 */
export function toMemberSelectOption(
  member: OrganizationMemberOutput,
  organizationId: string,
  value: string = `/api/organizations/${organizationId}/members/${member.id}`,
): MemberSelectOption {
  const displayName: string =
    member.displayName?.trim() ||
    [member.firstName, member.lastName].filter(Boolean).join(' ').trim() ||
    member.userId;
  const initials: string =
    [member.firstName, member.lastName]
      .filter(Boolean)
      .map((part) => part?.charAt(0))
      .join('')
      .toUpperCase() ||
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() ||
    '?';

  return {
    label: displayName,
    value,
    displayName,
    roleLabel: member.roleNames?.join(', ') || $localize`:@@org.member.noRole:No assigned role`,
    avatarUrl: member.avatarUrl ?? null,
    initials,
  };
}
