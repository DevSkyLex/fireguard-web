/**
 * Type ConversationVisibility
 * @type ConversationVisibility
 *
 * @description
 * How access is decided: `subject` defers to the attached record's own read
 * permission, `participants` requires an explicit membership row (channels and
 * direct conversations).
 *
 * @since 1.0.0
 */
export type ConversationVisibility = 'subject' | 'participants';
