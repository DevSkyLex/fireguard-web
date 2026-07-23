import type { MessageBodySegment } from '@features/collaboration/models';

/**
 * Matches an inline mention marker.
 *
 * Mentions are not a field on the message: the author writes `@{memberUuid}`
 * inline and the server parses it out into the `mentions` array while leaving
 * the marker in the body.
 */
const MENTION_PATTERN = /@\{([0-9a-fA-F-]{36})\}/g;

/**
 * Function tokenizeMessageBody
 * @function tokenizeMessageBody
 *
 * @description
 * Splits a message body into renderable segments, lifting inline mention
 * markers out of the surrounding HTML.
 *
 * The body is HTML the server has already sanitized against a fixed allow-list.
 * Splitting on the marker is safe because the marker only ever appears in text
 * content, never inside an attribute — so no tag is ever cut in half.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string | undefined} body - Sanitized message body, absent on a tombstone.
 *
 * @returns {readonly MessageBodySegment[]} The body in render order; empty when there is no body.
 *
 * @example
 * ```typescript
 * tokenizeMessageBody('Ping @{7f1c…} please');
 * // [{ kind: 'text', value: 'Ping ' }, { kind: 'mention', value: '7f1c…' }, …]
 * ```
 */
export function tokenizeMessageBody(body: string | undefined): readonly MessageBodySegment[] {
  if (!body) return [];

  const segments: MessageBodySegment[] = [];
  let cursor = 0;

  // `matchAll` needs its own iteration because the pattern is global and
  // sharing `lastIndex` across calls would skip matches.
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index: number = match.index ?? 0;

    if (index > cursor) {
      segments.push({ kind: 'text', value: body.slice(cursor, index) });
    }

    segments.push({ kind: 'mention', value: match[1] });
    cursor = index + match[0].length;
  }

  if (cursor < body.length) {
    segments.push({ kind: 'text', value: body.slice(cursor) });
  }

  return segments;
}
