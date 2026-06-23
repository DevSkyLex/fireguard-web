import type { AvatarSize, AvatarUrls } from '../models';

/**
 * Function pickAvatarUrl
 *
 * @description
 * Resolves the avatar URL best suited for the requested display size.
 * Falls back to the next larger variant, then smaller ones, then the
 * provided legacy single URL when no variant map is available.
 *
 * @since 1.0.0
 *
 * @param {AvatarUrls | null | undefined} avatarUrls - Variant map returned by the backend.
 * @param {AvatarSize} size - Preferred variant size.
 * @param {string | null | undefined} fallback - Legacy single avatar URL.
 * @returns {string | null} Resolved avatar URL or null.
 */
export function pickAvatarUrl(
  avatarUrls: AvatarUrls | null | undefined,
  size: AvatarSize,
  fallback?: string | null,
): string | null {
  if (avatarUrls) {
    const exact: string | undefined = avatarUrls[size];
    if (exact) return exact;

    const ordered: ReadonlyArray<AvatarSize> = ['256', '128', '64', '32'];
    const index: number = ordered.indexOf(size);

    // Prefer larger variants (downscaling preserves quality), then smaller ones.
    for (let i = index - 1; i >= 0; i--) {
      const url: string | undefined = avatarUrls[ordered[i]];
      if (url) return url;
    }
    for (let i = index + 1; i < ordered.length; i++) {
      const url: string | undefined = avatarUrls[ordered[i]];
      if (url) return url;
    }
  }

  return fallback ?? null;
}
