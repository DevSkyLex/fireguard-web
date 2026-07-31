/**
 * Type ChatMessageStatus
 * @typedef ChatMessageStatus
 *
 * @description
 * Where a message is in its delivery: confirmed, still on its way, or refused.
 *
 * A view shape, not a state shape. Whoever owns the conversation is free to
 * track in-flight ids however it likes; the row only needs to know which of
 * three things to draw.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type ChatMessageStatus = 'sent' | 'pending' | 'failed';
