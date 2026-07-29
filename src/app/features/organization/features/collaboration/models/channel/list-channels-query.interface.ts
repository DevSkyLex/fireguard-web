/**
 * Interface ListChannelsQuery
 * @interface ListChannelsQuery
 *
 * @description
 * Filters for `GET /api/channels`.
 *
 * `isArchived` is presence-based server-side: omit it to get archived and
 * unarchived alike. Never send an empty string — it coerces to `false` and
 * silently narrows the result to unarchived only.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListChannelsQuery {
  /** Organization IRI or bare UUID. Required. */
  readonly organization: string;
  readonly isArchived?: boolean;
  readonly page?: number;
  /** Clamped server-side to 1–100, whatever is asked for. */
  readonly itemsPerPage?: number;
}
