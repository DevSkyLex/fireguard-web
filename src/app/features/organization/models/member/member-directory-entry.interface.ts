/**
 * Interface MemberDirectoryEntry
 * @interface MemberDirectoryEntry
 *
 * @description
 * The minimum needed to put a human name and a face on a member id, published
 * to sibling features through `MEMBER_DIRECTORY_PORT`.
 * A deliberately narrow projection of `OrganizationMemberOutput`: consumers
 * resolving an author or a participant have no business seeing emails, join
 * dates or role ids.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MemberDirectoryEntry {
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Bare member UUID — the key every messaging surface carries.
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * Never blank: falls back to a neutral localized label when the API sends no name.
   *
   * @type {string}
   */
  readonly displayName: string;

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * Optional avatar URL used alongside the member name in roster surfaces.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | undefined}
   */
  readonly avatarUrl?: string;

  /**
   * Property roleNames
   * @readonly
   *
   * @description
   * Resolved role names, in API order. Empty when the member has no role.
   *
   * @type {readonly string[]}
   */
  readonly roleNames: readonly string[];

  /**
   * Property isActive
   * @readonly
   *
   * @description
   * Whether the member is currently active in the organization.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {boolean}
   */
  readonly isActive: boolean;

  /**
   * Property isOwner
   * @readonly
   *
   * @description
   * Whether the member owns the organization; optional so hand-built entries may omit it.
   *
   * @type {boolean}
   */
  readonly isOwner?: boolean;
}
