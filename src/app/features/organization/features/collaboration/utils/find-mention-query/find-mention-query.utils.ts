import type { MentionQuery } from '@features/organization/features/collaboration/models';

/**
 * Longest `@…` term still treated as a search.
 *
 * Display names carry spaces, so the term cannot stop at the first one; a
 * ceiling is what keeps a whole sentence after a stray `@` from being read as a
 * query that will never match.
 */
const MAX_TERM_LENGTH = 32;

/** Characters an `@` may follow and still open a mention. */
const OPENERS = /[\s([{<"']/;

/**
 * Function findMentionQuery
 * @function findMentionQuery
 *
 * @description
 * Reports the `@…` the caret is inside, or `null` when it is not in one.
 *
 * Scans backwards from the caret rather than matching the whole draft: only the
 * run the caret sits in can be the active query, and an author editing the
 * middle of a long message must not re-open a mention they finished earlier.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} text - The draft as typed.
 * @param {number} caret - Caret offset in that draft.
 *
 * @returns {MentionQuery | null} The active query, or `null`.
 *
 * @example
 * ```typescript
 * findMentionQuery('ping @jea', 9); // { start: 5, end: 9, term: 'jea' }
 * ```
 */
export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const bounded: number = Math.max(0, Math.min(caret, text.length));
  let index: number = bounded - 1;

  while (index >= 0) {
    const char: string = text[index];

    if (char === '@') break;
    // A newline ends the run, and a backtick means the caret is somewhere in a
    // code span, where an `@` is text the author wants kept verbatim.
    if (char === '\n' || char === '`') return null;
    if (bounded - index > MAX_TERM_LENGTH) return null;

    index -= 1;
  }

  if (index < 0) return null;

  // `foo@bar` is an email, not a mention: the `@` has to start a word.
  if (index > 0 && !OPENERS.test(text[index - 1])) return null;

  const term: string = text.slice(index + 1, bounded);

  // A term never ends on whitespace. Display names contain spaces, so the term
  // cannot simply stop at the first one — but this is what closes the list the
  // moment a mention is accepted, since accepting leaves the caret one space
  // past the inserted label.
  if (/\s$/.test(term)) return null;

  return { start: index, end: bounded, term };
}
