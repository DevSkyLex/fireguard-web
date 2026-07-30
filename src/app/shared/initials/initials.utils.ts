/**
 * Function deriveInitials
 *
 * @description
 * Derives up to two uppercase initials from a display label: the first letter
 * of each of the first two words, or the first two letters of a single word.
 *
 * Extracted on its third consumer (`ActivityFeed`, `AvatarStack`, and the
 * workspace organization rail), which is the point at which the shape is
 * proven rather than guessed.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} label - Display name to derive initials from.
 *
 * @returns {string} The derived initials, or an empty string for a blank label.
 *
 * @example
 * ```typescript
 * deriveInitials('Ella Uzer');   // 'EU'
 * deriveInitials('Fireguard');   // 'FI'
 * deriveInitials('   ');         // ''
 * ```
 */
export function deriveInitials(label: string): string {
  const parts: string[] = label.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}
