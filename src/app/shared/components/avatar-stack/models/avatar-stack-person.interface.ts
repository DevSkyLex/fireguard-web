/**
 * Interface AvatarStackPerson
 *
 * @description
 * Minimal identity shape rendered by {@link AvatarStack}: a display label
 * (used for initials and as the fallback accessible name), an optional
 * avatar image, and an optional tooltip override.
 *
 * @since 1.0.0
 */
export interface AvatarStackPerson {
  /** Display name, used to derive initials and as the fallback tooltip/aria-label. */
  readonly label: string;

  /** Avatar image URL. Falls back to initials when absent. */
  readonly image?: string;

  /** Tooltip text override. Defaults to {@link label}. */
  readonly tooltip?: string;
}
