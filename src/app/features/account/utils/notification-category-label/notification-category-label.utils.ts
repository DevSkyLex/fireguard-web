/**
 * Function humanizeNotificationCategory
 * @description Turns a raw notification category identifier into a readable label: separators
 * become spaces and the first letter is capitalized (`non_conformity` becomes "Non conformity").
 * There is no category label registry to reuse — the feed carries raw identifiers — so this stays
 * a plain presentation fallback shared by the filter chips, the feed rows and the preference matrix.
 * @access public
 * @since 1.0.0
 * @param {string} category - The raw category identifier.
 * @returns {string} The human-readable label.
 */
export function humanizeNotificationCategory(category: string): string {
  const spaced: string = category.replaceAll(/[._-]/g, ' ').trim();
  return spaced.length === 0 ? category : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
