/**
 * Constant QUICK_REACTIONS
 * @const QUICK_REACTIONS
 *
 * @description
 * The emojis the picker offers, in rendering order.
 *
 * A short fixed set rather than a full emoji keyboard: reacting is meant to
 * cost one tap, and the API stores whatever string it is sent, so a wider
 * choice would fragment the tallies without adding meaning. Anything already
 * on a message stays reactable whether or not it is listed here.
 *
 * @since 1.0.0
 *
 * @type {readonly string[]}
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const QUICK_REACTIONS: readonly string[] = ['👍', '🎉', '❤️', '😄', '👀', '🙏'];
