import type {
  InterventionMentionQuery,
  InterventionMentionSegment,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';

/**
 * Matches the canonical token and the HTML-escaped at-sign persisted by older
 * comment clients, capturing the member uuid in either representation.
 */
const MENTION_TOKEN: RegExp =
  /(?:@|&#64;|&#x40;)\{([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}/gi;

/** Characters an `@` may follow and still open a mention. */
const OPENERS: RegExp = /[\s([{<"']/;

/** Longest `@…` term still treated as a search — display names carry spaces. */
const MAX_TERM_LENGTH: number = 32;

/**
 * Function parseInterventionMentions
 *
 * @description
 * Splits a comment body into text and mention runs, in order — the shape both
 * the composer's live "who gets notified" chips and the activity thread's
 * rendering need. The canonical token is an at-sign followed by a
 * brace-wrapped member uuid. The HTML-escaped at-sign variants are accepted
 * for legacy records, but the returned mention value is always the bare uuid.
 * A stray `@` or an unresolvable id-shaped token stays literal text.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} body - The comment body, as typed or as stored.
 *
 * @returns {readonly InterventionMentionSegment[]} Text and mention runs, in order.
 *
 * @example
 * ```typescript
 * parseInterventionMentions('ping @{3fa8...} now');
 * // [{ kind: 'text', value: 'ping ' }, { kind: 'mention', value: '3fa8...' }, { kind: 'text', value: ' now' }]
 * ```
 */
export function parseInterventionMentions(body: string): readonly InterventionMentionSegment[] {
  const segments: InterventionMentionSegment[] = [];
  let cursor: number = 0;

  MENTION_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null = MENTION_TOKEN.exec(body);

  while (match !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', value: body.slice(cursor, match.index) });
    }
    segments.push({ kind: 'mention', value: match[1] });
    cursor = match.index + match[0].length;
    match = MENTION_TOKEN.exec(body);
  }

  if (cursor < body.length) segments.push({ kind: 'text', value: body.slice(cursor) });

  return segments;
}

/**
 * Function findInterventionMentionQuery
 *
 * @description
 * Reports the `@…` the caret is inside while drafting a comment, or `null`
 * when it is not in one. Scans backwards from the caret rather than matching
 * the whole draft, so only the run the caret currently sits in can be the
 * active query.
 *
 * Mirrors the collaboration composer's own caret-query scan rather than
 * importing it (interventions may not depend on collaboration internals);
 * this variant drops the backtick/code-span exception, since a comment body
 * is plain text with no such notion.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} text - The draft as typed.
 * @param {number} caret - Caret offset in that draft.
 *
 * @returns {InterventionMentionQuery | null} The active query, or `null`.
 *
 * @example
 * ```typescript
 * findInterventionMentionQuery('ping @jea', 9); // { start: 5, end: 9, term: 'jea' }
 * ```
 */
export function findInterventionMentionQuery(
  text: string,
  caret: number,
): InterventionMentionQuery | null {
  const bounded: number = Math.max(0, Math.min(caret, text.length));
  let index: number = bounded - 1;

  while (index >= 0) {
    const char: string = text[index];

    if (char === '@') break;
    if (char === '\n') return null;
    if (bounded - index > MAX_TERM_LENGTH) return null;

    index -= 1;
  }

  if (index < 0) return null;
  if (index > 0 && !OPENERS.test(text[index - 1])) return null;

  const term: string = text.slice(index + 1, bounded);

  if (/\s$/.test(term)) return null;

  return { start: index, end: bounded, term };
}

/**
 * Function resolveInterventionMentionMember
 *
 * @description
 * Resolves a mention token's member uuid against the loaded member options.
 * A mention token carries the bare uuid the backend notified, while
 * {@link MemberSelectOption.value} is IRI-shaped
 * (`/api/organizations/{org}/members/{uuid}`) — so this matches the IRI's
 * trailing segment rather than the whole-value equality
 * `resolveInterventionActivityActor` uses for an activity's actor IRI.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} memberId - The mentioned member's uuid.
 * @param {readonly MemberSelectOption[]} members - The organization's loaded members.
 *
 * @returns {MemberSelectOption | null} The matching member, or `null` when unresolved.
 */
export function resolveInterventionMentionMember(
  memberId: string,
  members: readonly MemberSelectOption[],
): MemberSelectOption | null {
  return (
    members.find((member: MemberSelectOption): boolean => member.value.endsWith(`/${memberId}`)) ??
    null
  );
}

/**
 * Function interventionMemberId
 *
 * @description
 * The bare uuid a mention token carries for the given member, read off the
 * trailing segment of their IRI-shaped {@link MemberSelectOption.value}.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {MemberSelectOption} member - The member being mentioned.
 *
 * @returns {string} The member's uuid.
 */
export function interventionMemberId(member: MemberSelectOption): string {
  return member.value.split('/').pop() ?? member.value;
}
