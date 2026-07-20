/**
 * Function toMemberId
 *
 * @description
 * Extracts the bare member id from a member reference.
 *
 * Messaging payloads carry members as IRIs —
 * `/api/organizations/{organizationId}/members/{memberId}` for
 * `authorMember`, `pinnedBy` and every entry of `mentions`. Everything that
 * resolves a member (the directory, the presence set, the presence request)
 * is keyed by the bare id, so the two only meet through this function.
 *
 * Tolerant of an already-bare id so a caller cannot double-convert, and of an
 * empty string so an unknown author degrades to "not found" rather than
 * throwing.
 *
 * @param {string} reference - A member IRI, or an already-bare member id.
 *
 * @returns {string} The bare member id.
 *
 * @since 1.0.0
 */
export function toMemberId(reference: string): string {
  const separator: number = reference.lastIndexOf('/');

  return separator === -1 ? reference : reference.slice(separator + 1);
}
