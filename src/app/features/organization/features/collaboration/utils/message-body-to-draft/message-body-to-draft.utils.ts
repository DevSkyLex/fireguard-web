/** Matches `@{memberUuid}` after entity decoding. Global for `replaceAll`. */
const MENTION_MARKER = /@\{([0-9a-fA-F-]{36})\}/g;

/** Tags whose end (or self-closing form) means a line break in plain text. */
const LINE_BREAK_TAGS = /<br\s*\/?>|<\/p>|<\/div>/gi;

/** Any remaining tag, dropped wholesale. */
const ANY_TAG = /<[^>]*>/g;

/**
 * Function messageBodyToDraft
 * @function messageBodyToDraft
 *
 * @description
 * Turns a stored message body back into the plain text the composer works
 * in, so an edit starts from what the author actually wrote.
 *
 * The server stores sanitized HTML: entities are escaped (every `@` in a text
 * node becomes `&#64;`, so a mention marker reads `&#64;{memberUuid}`), and a
 * body written in the retired rich editor may still carry block tags. This
 * reverses both, then rewrites each mention marker into the human-readable
 * `@Name` form the composer shows — `applyMentionMarkers` puts the markers
 * back on submit, fed the same names inverted.
 *
 * A marker whose member has no resolvable name is left as the raw marker:
 * turning it into a label that cannot be mapped back would silently drop the
 * mention on save.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string | undefined} body - Server-sanitized body; absent on a tombstone.
 * @param {Readonly<Record<string, string>>} mentionNames - Display names by bare member id.
 *
 * @returns {string} An editable plain-text draft.
 *
 * @example
 * ```typescript
 * messageBodyToDraft('Hello &#64;{uuid}', { uuid: 'Ana' }); // 'Hello @Ana'
 * ```
 */
export function messageBodyToDraft(
  body: string | undefined,
  mentionNames: Readonly<Record<string, string>>,
): string {
  if (body === undefined || body.length === 0) return '';

  const text: string = body
    .replaceAll(LINE_BREAK_TAGS, '\n')
    .replaceAll(ANY_TAG, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&#64;', '@')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

  return text
    .replaceAll(MENTION_MARKER, (marker: string, memberId: string): string => {
      const name: string | undefined = mentionNames[memberId];

      return name === undefined ? marker : `@${name}`;
    })
    .trimEnd();
}
