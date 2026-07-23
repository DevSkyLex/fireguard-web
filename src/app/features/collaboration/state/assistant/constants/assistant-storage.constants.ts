/**
 * Constant ASSISTANT_THREAD_COOKIE_PREFIX
 * @const ASSISTANT_THREAD_COOKIE_PREFIX
 *
 * @description
 * Prefix of the cookie remembering which thread the panel was on, suffixed with
 * the organization id.
 *
 * Persisting it is what makes the assistant resumable at all: threads are
 * created lazily and the API exposes no way to find "my" thread again — the
 * listing endpoint takes no member filter. Without this, every reload would
 * start a new conversation and the whole transcript read would be unreachable.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {string}
 */
export const ASSISTANT_THREAD_COOKIE_PREFIX = 'fg-assistant-thread-';

/**
 * Constant ASSISTANT_THREAD_COOKIE_MAX_AGE
 * @const ASSISTANT_THREAD_COOKIE_MAX_AGE
 *
 * @description
 * How long the remembered thread survives, in seconds — thirty days.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {number}
 */
export const ASSISTANT_THREAD_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
