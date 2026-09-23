/**
 * Function splitHtmlSegments
 * @function splitHtmlSegments
 * @description Splits serialized HTML into tags and text with a single forward scan.
 * A `>` inside a quoted attribute does not close its tag. An unterminated tag
 * remains text so malformed content is preserved for the caller.
 * @access public
 * @since 1.0.0
 * @param {string} html - Serialized editor content.
 * @returns {readonly { readonly value: string; readonly isTag: boolean }[]} Ordered tags and text.
 */
export function splitHtmlSegments(
  html: string,
): readonly { readonly value: string; readonly isTag: boolean }[] {
  const segments: { readonly value: string; readonly isTag: boolean }[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    const open = html.indexOf('<', cursor);
    if (open === -1) {
      segments.push({ value: html.slice(cursor), isTag: false });
      break;
    }
    if (open > cursor) segments.push({ value: html.slice(cursor, open), isTag: false });

    let close = -1;
    let quote: '"' | "'" | null = null;
    for (let index = open + 1; index < html.length; index++) {
      const character = html[index];
      if (quote !== null) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        close = index;
        break;
      }
    }
    if (close === -1) {
      segments.push({ value: html.slice(open), isTag: false });
      break;
    }
    segments.push({ value: html.slice(open, close + 1), isTag: true });
    cursor = close + 1;
  }

  return segments;
}
