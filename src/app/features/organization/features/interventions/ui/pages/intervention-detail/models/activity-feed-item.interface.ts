/**
 * Interface ActivityFeedItem
 *
 * @description
 * A single entry rendered by the intervention activity timeline: either a
 * compact `event` line (an automated or system action) or a `comment` card
 * (a person's written note).
 *
 * @since 3.1.0
 */
export interface ActivityFeedItem {
  /** Stable identifier, used for row tracking. */
  readonly id: string;

  /** When the entry occurred. */
  readonly timestamp: string | Date;

  /** Display name of the entry's author. */
  readonly authorLabel: string;

  /** PrimeIcons class shown for an `event` entry. Falls back to initials when absent. */
  readonly icon?: string;

  /** Short trailing text for an `event` entry, e.g. `"marked this done"`. */
  readonly text?: string;

  /** Full body text for a `comment` entry. */
  readonly body?: string;

  /** Rendering shape: a compact `event` line, or a `comment` card. */
  readonly kind: 'comment' | 'event';
}
