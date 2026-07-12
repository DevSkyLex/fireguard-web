/**
 * Constant HTTP_SERVER_ERROR
 * @const HTTP_SERVER_ERROR
 *
 * @description
 * Lower bound of the HTTP 5xx server-error range. A replay failing with a status
 * at or above this is treated as transient: the operation stays pending and the
 * rest of the outbox keeps replaying instead of freezing.
 *
 * @since 1.1.0
 *
 * @type {number}
 */
export const HTTP_SERVER_ERROR = 500;
