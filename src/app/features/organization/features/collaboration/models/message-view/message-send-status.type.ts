/**
 * Type MessageSendStatus
 * @typedef MessageSendStatus
 *
 * @description
 * How far a message has got on its way to the server. A fact about this client
 * rather than about the message, which is why it is not on the transport type.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type MessageSendStatus = 'sent' | 'pending' | 'failed';
