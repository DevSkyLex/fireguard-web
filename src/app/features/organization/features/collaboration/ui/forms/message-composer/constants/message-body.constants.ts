/**
 * Constant MESSAGE_BODY_MAX_LENGTH
 * @const MESSAGE_BODY_MAX_LENGTH
 *
 * @description
 * Longest message the API will store.
 *
 * The input DTO advertises 40 000, but the domain value object rejects anything
 * over this — so a longer body passes validation and is refused by the handler
 * with a 422. This is the number that matters.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const MESSAGE_BODY_MAX_LENGTH: number = 4000;

/**
 * Constant MESSAGE_COUNTER_THRESHOLD
 * @const MESSAGE_COUNTER_THRESHOLD
 *
 * @description
 * How close to the cap a message gets before the composer shows how much room
 * is left.
 *
 * A counter that is always on is noise nobody reads — almost every message is
 * two lines. It earns its place only once the limit is in sight.
 *
 * @since 2.0.0
 *
 * @type {number}
 */
export const MESSAGE_COUNTER_THRESHOLD: number = 200;

/**
 * Constant MENTION_SUGGESTION_LIMIT
 * @const MENTION_SUGGESTION_LIMIT
 *
 * @description
 * Most members the mention list offers at once.
 *
 * The list opens above the composer, so an uncapped one would cover the
 * conversation being written into. Narrowing the term is the way to reach
 * someone further down.
 *
 * @since 2.0.0
 *
 * @type {number}
 */
export const MENTION_SUGGESTION_LIMIT: number = 6;
