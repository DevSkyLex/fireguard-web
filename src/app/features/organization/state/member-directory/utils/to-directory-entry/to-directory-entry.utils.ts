import type { MemberDirectoryEntry, OrganizationMemberOutput } from '@features/organization/models';

/**
 * Function toDirectoryEntry
 * @function toDirectoryEntry
 *
 * @description
 * Narrows an organization member to the directory projection, resolving the
 * best available label.
 *
 * `displayName`, `firstName` and `lastName` are all optional **and** nullable
 * on this contract — unusually, since the API omits nulls everywhere else — so
 * each is checked for emptiness rather than for presence.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {OrganizationMemberOutput} member - Member as returned by the API.
 *
 * @returns {MemberDirectoryEntry} The directory projection.
 */
export function toDirectoryEntry(member: OrganizationMemberOutput): MemberDirectoryEntry {
  return {
    memberId: member.id,
    displayName: resolveDisplayName(member),
    avatarUrl: member.avatarUrl ?? undefined,
    roleNames: member.roleNames ?? [],
    isActive: member.isActive,
  };
}

/**
 * Function resolveDisplayName
 * @function resolveDisplayName
 *
 * @description
 * Resolves the strongest non-blank member label: display name, full name,
 * then email. A record lacking all three uses a neutral localized label so
 * its internal identifier never becomes interface copy.
 *
 * @access private
 * @since 1.1.0
 *
 * @param {OrganizationMemberOutput} member - Member returned by the organization API.
 *
 * @returns {string} A non-blank reader-facing label.
 */
function resolveDisplayName(member: OrganizationMemberOutput): string {
  const displayName: string = (member.displayName ?? '').trim();

  if (displayName.length > 0) return displayName;

  const fullName: string = [member.firstName ?? '', member.lastName ?? '']
    .map((part: string): string => part.trim())
    .filter((part: string): boolean => part.length > 0)
    .join(' ');

  if (fullName.length > 0) return fullName;

  return (member.email ?? '').trim() || $localize`:@@common.unknownMember:Unknown member`;
}
