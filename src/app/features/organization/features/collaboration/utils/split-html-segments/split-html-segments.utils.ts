import { findHtmlTagClose } from '../find-html-tag-close/find-html-tag-close.utils';

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

    const close = findHtmlTagClose(html, open);
    if (close === -1) {
      segments.push({ value: html.slice(open), isTag: false });
      break;
    }
    segments.push({ value: html.slice(open, close + 1), isTag: true });
    cursor = close + 1;
  }

  return segments;
}
