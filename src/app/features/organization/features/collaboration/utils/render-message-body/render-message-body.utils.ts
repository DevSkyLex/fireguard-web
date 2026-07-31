import { escapeHtml } from '../escape-html/escape-html.utils';

/**
 * Matches an inline mention marker.
 *
 * Mentions are not a field on the message: the author writes `@{memberUuid}`
 * inline and the server parses it out into the `mentions` array while leaving
 * the marker in the body.
 *
 * `&#64;` is not an edge case — it is the form every stored body carries.
 * Symfony's sanitizer rewrites every `@` in a text node, so a body read back
 * from the API never contains the bare marker the composer sent.
 */
const MENTION_PATTERN =
  /(?:@|&#64;)\{([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}/g;

/**
 * Chip styling, written as one literal so Tailwind's scanner keeps every class.
 *
 * `class` is the only attribute that survives both ends of the round trip: the
 * API's allow-list gives `span` no attributes at all, so this is applied here,
 * on the way to the DOM, never stored.
 */
const MENTION_CLASS = 'rounded-sm bg-primary/10 px-1 font-medium text-primary';

/**
 * Function renderMessageBodyHtml
 * @function renderMessageBodyHtml
 *
 * @description
 * Turns a stored message body into the HTML the row renders, replacing each
 * `@{memberUuid}` marker with a labelled mention chip.
 *
 * Substitution, not tokenization: an earlier version split the body at every
 * marker and bound each run separately, which silently broke as soon as a
 * mention sat inside formatting — `**hi @bob**` splits `<strong>` across two
 * bindings and each half is auto-closed by the parser. Replacing in place keeps
 * the document well-formed whatever surrounds the mention.
 *
 * The body is HTML the server already sanitized against a fixed allow-list, and
 * Angular sanitizes it again on binding. Only the label is untrusted here, and
 * it is escaped.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string | undefined} body - Server-sanitized body; absent on a tombstone.
 * @param {Readonly<Record<string, string>>} memberNames - Display names by bare member id.
 * @param {string} unknownLabel - Label for a member the caller could not resolve.
 *
 * @returns {string} Bindable HTML; empty when there is no body.
 *
 * @example
 * ```typescript
 * renderMessageBodyHtml('<p>Ping @{7f1c…}</p>', { '7f1c…': 'Jean' }, 'member');
 * // '<p>Ping <span class="…">@Jean</span></p>'
 * ```
 */
export function renderMessageBodyHtml(
  body: string | undefined,
  memberNames: Readonly<Record<string, string>>,
  unknownLabel: string,
): string {
  if (!body) return '';

  return body.replace(MENTION_PATTERN, (_marker: string, memberId: string): string => {
    const label: string = memberNames[memberId] ?? unknownLabel;

    return `<span class="${MENTION_CLASS}">@${escapeHtml(label)}</span>`;
  });
}
