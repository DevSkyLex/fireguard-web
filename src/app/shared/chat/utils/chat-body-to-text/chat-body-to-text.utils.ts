/**
 * Tags whose end marks a line break once the markup is gone.
 *
 * `textContent` alone would run every paragraph and list item together, which
 * is exactly what makes a pasted message unreadable.
 */
const BLOCK_END_PATTERN = /<\/(p|div|li|blockquote|pre|h[1-6])\s*>/gi;

/** Self-closing break, in any of the spellings a rich-text editor emits. */
const LINE_BREAK_PATTERN = /<br\s*\/?>/gi;

/** Any remaining tag, for the no-DOM fallback. */
const TAG_PATTERN = /<[^>]*>/g;

/** Three or more consecutive newlines, which no message needs. */
const EXCESS_BLANK_LINES_PATTERN = /\n{3,}/g;

/**
 * Function chatBodyToText
 * @function chatBodyToText
 *
 * @description
 * Flattens a rendered message body to the plain text a reader expects on the
 * clipboard: no markup, entities decoded, and one line break where the markup
 * drew one.
 *
 * The HTML is parsed rather than pattern-stripped, so `&amp;` and friends come
 * back as characters. `DOMParser` builds an inert document — it runs no script
 * and fetches nothing — which is what makes this safe on a body this function
 * did not produce. Off the browser there is no parser, so entities are left as
 * written rather than silently mangled.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} bodyHtml - The rendered message body.
 *
 * @returns {string} The message as text, trimmed.
 *
 * @example
 * ```typescript
 * chatBodyToText('<p>Hello <strong>world</strong></p>'); // 'Hello world'
 * ```
 */
export function chatBodyToText(bodyHtml: string): string {
  const withBreaks: string = bodyHtml
    .replace(LINE_BREAK_PATTERN, '\n')
    .replace(BLOCK_END_PATTERN, '\n');

  if (typeof DOMParser === 'undefined') {
    return normalize(withBreaks.replace(TAG_PATTERN, ''));
  }

  const parsed: Document = new DOMParser().parseFromString(withBreaks, 'text/html');

  return normalize(parsed.body.textContent ?? '');
}

/** Collapses the blank lines the block replacements leave behind. */
function normalize(text: string): string {
  return text.replace(EXCESS_BLANK_LINES_PATTERN, '\n\n').trim();
}
