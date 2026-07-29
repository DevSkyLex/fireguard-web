/**
 * Type ConversationSubjectType
 * @type ConversationSubjectType
 *
 * @description
 * What a conversation is attached to. Channels and direct messages live in the
 * same table as subject threads and are told apart by this discriminator.
 *
 * @since 1.0.0
 */
export type ConversationSubjectType =
  | 'facility'
  | 'equipment'
  | 'intervention'
  | 'non_conformity'
  | 'channel'
  | 'direct';
