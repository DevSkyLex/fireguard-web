import type { HydraItem } from '@core/api/models';

/**
 * Interface MessagingLinkOutput
 * @interface MessagingLinkOutput
 *
 * @description
 * A URL the server extracted from a message body, as listed by
 * `GET /api/conversations/{id}/links`.
 *
 * Two things are deliberately absent and cannot be worked around client-side:
 * {@link label} is never populated by extraction, so it always arrives
 * `undefined`; and there is no author or body, so a "posted by" line is not
 * renderable without a second lookup that no endpoint offers.
 *
 * Deleting a message does **not** remove its extracted links, so this list can
 * surface URLs from tombstoned messages.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessagingLinkOutput extends HydraItem {
  /** Bare UUID. The entity key — `@id` is a per-request Skolem genid. */
  readonly id: string;
  readonly url: string;
  /** Reserved for a future link-preview feature; never sent today. */
  readonly label?: string;
  /** Bare message UUID, **not** an IRI, and not dereferenceable. */
  readonly messageId: string;
  /**
   * Every link extracted from one message shares the same instant, so this
   * column ties on multi-link messages and cannot be a stable sort key.
   */
  readonly createdAt: string;
}
