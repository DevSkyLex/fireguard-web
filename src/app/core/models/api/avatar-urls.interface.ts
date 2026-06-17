/**
 * Type AvatarSize
 *
 * @description
 * Avatar variant sizes (in pixels) exposed by the backend.
 *
 * @since 1.0.0
 */
export type AvatarSize = '256' | '128' | '64' | '32';

/**
 * Type AvatarUrls
 *
 * @description
 * Map of avatar variant URLs keyed by pixel size, as returned by the
 * user endpoints (e.g. `{ "256": ".../avatar/256.webp", ... }`).
 *
 * @since 1.0.0
 */
export type AvatarUrls = Readonly<Partial<Record<AvatarSize, string>>>;
