/** Splits an HTML string into tags and the text between them. */
const TAG_SPLIT = /(<[^>]*>)/;

/**
 * Function applyMentionMarkers
 * @function applyMentionMarkers
 *
 * @description
 * Rewrites the `@Label` forms shown in the editor into the `@{memberUuid}`
 * markers the API parses mentions from.
 *
 * The editor shows names and the composer keeps the pairing, rather than
 * putting UUIDs in front of the author: the draft has to stay something a human
 * can read and edit. Labels are substituted longest-first so `@Ana Costa` is
 * never consumed by a shorter `@Ana`.
 *
 * Substitution is confined to **text between tags**. The body is HTML by the
 * time it gets here, and a label that happened to appear inside an `href` would
 * otherwise be rewritten into the middle of a URL.
 *
 * Each label is matched both as written and with `&`, `<` and `>` escaped,
 * because that is what Quill's serializer emits for those characters.
 *
 * A mention the author has since deleted or retyped simply finds no match and
 * is dropped — the map records what was picked, not what the draft still says.
 *
 * @access public
 * @since 2.0.0
 *
 * @param {string} html - The draft, serialized.
 * @param {ReadonlyMap<string, string>} mentions - Member id by inserted label.
 *
 * @returns {string} The body with markers in place of labels.
 *
 * @example
 * ```typescript
 * applyMentionMarkers('<p>ping @Jean</p>', new Map([['Jean', '7f1c…']]));
 * // '<p>ping @{7f1c…}</p>'
 * ```
 */
export function applyMentionMarkers(html: string, mentions: ReadonlyMap<string, string>): string {
  if (mentions.size === 0 || html.length === 0) return html;

  const labels: readonly string[] = [...mentions.keys()].toSorted(
    (a: string, b: string): number => b.length - a.length,
  );

  return html
    .split(TAG_SPLIT)
    .map((segment: string): string => {
      if (segment.startsWith('<')) return segment;

      return labels.reduce((text: string, label: string): string => {
        const marker = `@{${mentions.get(label) ?? ''}}`;

        return text.replaceAll(`@${label}`, marker).replaceAll(`@${escapeText(label)}`, marker);
      }, segment);
    })
    .join('');
}

/**
 * Function escapeText
 * @function escapeText
 *
 * @description
 * Escapes the three characters a serializer must encode inside a text node.
 *
 * Deliberately narrower than the feature's `escapeHtml`, which also encodes
 * quotes: quotes are safe unescaped in text content, so encoding them here
 * would build a label that never matches what the editor actually emitted.
 *
 * @access private
 * @since 2.0.0
 *
 * @param {string} value - Label as inserted.
 *
 * @returns {string} The label as it appears in serialized text.
 */
function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
