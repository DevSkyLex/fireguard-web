/**
 * Coarse expiry urgency bucket for a pending invitation.
 *
 * `later` means the expiry is far enough out that the absolute date reads
 * better than a relative phrase.
 */
export type InvitationExpiryBucket = 'expired' | 'today' | 'tomorrow' | 'later';
