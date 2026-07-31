/**
 * Function escapeHtml
 * @function escapeHtml
 *
 * @description
 * Escapes a string so it can be embedded in HTML text or in a double-quoted
 * attribute without being read as markup.
 *
 * Used wherever this feature *builds* HTML rather than receiving it — the
 * Markdown renderer and the mention chips. Both feed strings the member typed,
 * so this is the boundary that keeps authored text from becoming markup.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw text.
 *
 * @returns {string} The escaped text.
 *
 * @example
 * ```typescript
 * escapeHtml('<b>x</b> & "y"'); // '&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;'
 * ```
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
