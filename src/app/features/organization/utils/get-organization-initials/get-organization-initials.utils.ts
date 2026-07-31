/**
 * Function getOrganizationInitials
 * @function getOrganizationInitials
 *
 * @description
 * Derives a 1–2 letter uppercase initials string from an organization
 * name, used as the avatar/monogram fallback when no logo is available.
 * Returns an empty string for a blank name.
 *
 * @since 1.0.0
 *
 * @param {string} name - Organization name to derive the initials from.
 *
 * @returns {string} The derived initials, in uppercase.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function getOrganizationInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word: string): string => word[0].toUpperCase())
    .join('');
}
