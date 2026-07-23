import type { HydraItem } from '@core/api/models';

/**
 * Interface MessagingSubscriptionOutput
 * @interface MessagingSubscriptionOutput
 *
 * @description
 * A Mercure subscriber JWT scoped to one conversation's private topic.
 *
 * Its `@id` and `@type` are unusable — `@type` reports `Conversation` for this
 * DTO as well as for the activity buckets, so it cannot discriminate the three
 * outputs of `ConversationResource`. Read the scalar fields.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessagingSubscriptionOutput extends HydraItem {
  /** Subscriber JWT to hand to the Mercure hub. */
  readonly token: string;
  /** Private topic this token grants. */
  readonly topic: string;
}
