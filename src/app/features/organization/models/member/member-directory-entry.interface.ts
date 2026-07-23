/**
 * Interface MemberDirectoryEntry
 * @interface MemberDirectoryEntry
 *
 * @description
 * The minimum needed to put a human name and a face on a member id, published
 * to sibling features through `MEMBER_DIRECTORY_PORT`.
 *
 * A deliberately narrow projection of `OrganizationMemberOutput`: consumers
 * resolving an author or a participant have no business seeing emails, join
 * dates or role ids.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MemberDirectoryEntry {
  /** Bare member UUID — the key every messaging surface carries. */
  readonly memberId: string;
  /** Never blank: falls back to the member id when the API sends no name. */
  readonly displayName: string;
  readonly avatarUrl?: string;
  /** Resolved role names, in API order. Empty when the member has no role. */
  readonly roleNames: readonly string[];
  readonly isActive: boolean;
}
