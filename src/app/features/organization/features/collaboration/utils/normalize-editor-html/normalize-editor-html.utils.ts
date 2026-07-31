/**
 * Splits an HTML string into tags and the text between them.
 *
 * Deliberately duplicated from `applyMentionMarkers` rather than shared: it is
 * one line, the two utilities are independent, and the rule of three has not
 * been met.
 */
const TAG_SPLIT = /(<[^>]*>)/;

/**
 * Function normalizeEditorHtml
 * @function normalizeEditorHtml
 *
 * @description
 * Turns the non-breaking spaces Quill's serializer emits back into ordinary
 * ones.
 *
 * `getSemanticHTML()` encodes **every** space as `&nbsp;`, not just runs of
 * them. Left alone that breaks two things at once: a stored message never wraps
 * — every word is glued to the next — and a mention label of more than one word
 * stops matching, so it is never substituted for its marker and notifies
 * nobody.
 *
 * Only text between tags is touched; an attribute value is left as written.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} html - The editor's serialized content.
 *
 * @returns {string} The same content with breaking spaces.
 *
 * @example
 * ```typescript
 * normalizeEditorHtml('<p>Ana&nbsp;Costa</p>'); // '<p>Ana Costa</p>'
 * ```
 */
export function normalizeEditorHtml(html: string): string {
  if (html.length === 0) return html;

  return html
    .split(TAG_SPLIT)
    .map((segment: string): string =>
      segment.startsWith('<') ? segment : segment.replaceAll('&nbsp;', ' '),
    )
    .join('');
}
