import type {
  InterventionActivityOutput,
  InterventionStatusChangePayload,
} from '@features/organization/features/interventions/models';
import type { InterventionActivityBodySegment } from './intervention-activity-body-segment.interface';

/**
 * Interface InterventionActivityRowViewModel
 * @interface InterventionActivityRowViewModel
 *
 * @description
 * One timeline entry with every per-row derivation resolved once — actor
 * identity, relative timestamp, narrowed payloads, marker icon. The template
 * previously re-ran an O(members) actor lookup up to four times per row on
 * every change-detection pass; projecting the row here makes each binding a
 * field read.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionActivityRowViewModel {
  //#region Properties
  /** The underlying activity entry (id, kind, event, body, createdAt, actor). */
  readonly activity: InterventionActivityOutput;

  /** The author's display name, or the neutral fallback. */
  readonly actorName: string;

  /** The author's initials, for the avatar fallback. */
  readonly actorInitials: string;

  /** The author's avatar URL, when one is on file. */
  readonly actorAvatar: string | null;

  /** The entry's creation time as a localized relative label. */
  readonly relativeTime: string;

  /** The narrowed `status_changed` payload, or null for any other entry. */
  readonly statusChange: InterventionStatusChangePayload | null;

  /** The rescheduled window as a localized "start → due" label, or null. */
  readonly rescheduleLabel: string | null;

  /** The marker icon for a system entry's event. */
  readonly icon: string;

  /** The marker glyph's literal Tailwind tint classes. */
  readonly iconClass: string;

  /** A comment's body, split into text and resolved-mention runs; empty for a system entry. */
  readonly bodySegments: readonly InterventionActivityBodySegment[];
  //#endregion
}
