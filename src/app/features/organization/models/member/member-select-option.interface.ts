/**
 * Interface MemberSelectOption
 * @interface MemberSelectOption
 *
 * @description
 * An organization member as a picker offers it: the value a form submits
 * (a member IRI, a member id or a user id — the caller decides), the
 * display name, the role line, and what the avatar needs. Built by
 * `toMemberSelectOption`; rendered by `app-person-option`. `label` mirrors
 * `displayName` so the option satisfies the plain `{ label, value }` shape
 * generic pickers expect.
 *
 * @since 1.0.0
 */
export interface MemberSelectOption {
  /** What a form submits for this member. */
  readonly value: string;

  /** The display name, doubling as the generic option label. */
  readonly label: string;

  /** The member's display name. */
  readonly displayName: string;

  /** The member's roles joined, or the localized "no role" line. */
  readonly roleLabel: string;

  /** The avatar picture, or `null` to fall back to the initials. */
  readonly avatarUrl: string | null;

  /** One or two letters standing in for the picture. */
  readonly initials: string;
}
