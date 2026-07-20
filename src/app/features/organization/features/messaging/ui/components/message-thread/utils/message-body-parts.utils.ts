/**
 * One segment of a rendered message body: literal text, or a mention to be
 * shown as a chip.
 *
 * @since 1.0.0
 */
export interface MessageBodyPart {
  readonly kind: 'text' | 'mention';

  /**
   * The literal text, or — for a mention — the mentioned member's bare id.
   */
  readonly value: string;
}

/**
 * Mention token form, matching the backend's `MentionExtractor` regex exactly:
 * `@{memberUuid}`. Kept in lock-step on purpose — a looser pattern here would
 * chip text the server never treated as a mention.
 */
const MENTION_PATTERN: RegExp =
  /@\{([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}/g;

/**
 * Function toMessageBodyParts
 *
 * @description
 * Splits a message body into text and mention segments.
 *
 * Messages store mentions as `@{memberUuid}` tokens, so an unsplit body shows
 * the reader a raw UUID mid-sentence. Splitting lets the view swap each token
 * for the member's name.
 *
 * @param {string | null} body - The message body, or null for a deleted message.
 *
 * @returns {readonly MessageBodyPart[]} Ordered segments; empty for a null or empty body.
 *
 * @since 1.0.0
 */
export function toMessageBodyParts(body: string | null): readonly MessageBodyPart[] {
  if (body === null || body.length === 0) return [];

  const parts: MessageBodyPart[] = [];
  let lastIndex: number = 0;

  // `matchAll` over a fresh regex: the module-level literal carries `g`, and
  // sharing its `lastIndex` across calls would skip tokens on every other
  // message.
  for (const match of body.matchAll(new RegExp(MENTION_PATTERN))) {
    const start: number = match.index;

    if (start > lastIndex) {
      parts.push({ kind: 'text', value: body.slice(lastIndex, start) });
    }

    parts.push({ kind: 'mention', value: match[1] as string });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push({ kind: 'text', value: body.slice(lastIndex) });
  }

  return parts;
}
