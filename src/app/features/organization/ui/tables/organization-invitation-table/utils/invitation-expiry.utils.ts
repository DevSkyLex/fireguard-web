import type { InvitationExpiryBucket } from '../models';

/** Milliseconds in a day. */
const DAY_MS = 86_400_000;

/** UTC day index (whole days since the epoch) for a given instant. */
function utcDayIndex(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS,
  );
}

/**
 * Function invitationExpiryBucket
 *
 * @description
 * Classifies an invitation expiry ISO date into a coarse urgency bucket by
 * comparing whole calendar days (UTC) against `now` — so an invitation that
 * expires later the same day reads as "today", not "tomorrow". Pure and
 * deterministic: `now` is injected so the result is testable without mocking
 * the clock.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} iso - The invitation `expiresAt` ISO timestamp.
 * @param {Date} [now] - Reference instant (defaults to the current time).
 *
 * @returns {InvitationExpiryBucket} The urgency bucket.
 */
export function invitationExpiryBucket(
  iso: string,
  now: Date = new Date(),
): InvitationExpiryBucket {
  const diff = utcDayIndex(new Date(iso)) - utcDayIndex(now);
  if (diff < 0) return 'expired';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return 'later';
}
