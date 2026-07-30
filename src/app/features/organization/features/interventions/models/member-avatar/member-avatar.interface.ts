/**
 * Interface MemberAvatar
 *
 * @description
 * One member as rendered in an overlapping `p-avatar-group` stack: an image
 * when the member has one, initials otherwise, and a tooltip so identity is
 * never conveyed by the image alone.
 *
 * @since 3.1.0
 */
export interface MemberAvatar {
  /** Display name, also the initials source when no image is given. */
  readonly label: string;

  /** Avatar image URL, when the member has one. */
  readonly image?: string;

  /** Accessible label and tooltip text. Falls back to {@link label}. */
  readonly tooltip?: string;
}
