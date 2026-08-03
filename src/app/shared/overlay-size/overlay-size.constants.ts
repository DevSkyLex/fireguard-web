/**
 * Constant DIALOG_WIDTH_SM
 *
 * @description
 * `p-dialog` width for confirmations and other short, single-purpose prompts
 * — the narrowest of the three canonical dialog steps (DESIGN.md, "Overlays —
 * sizes").
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const DIALOG_WIDTH_SM: string = '28rem';

/**
 * Constant DIALOG_WIDTH_MD
 *
 * @description
 * `p-dialog` width for single-column forms — the default step for a dialog
 * hosting one form and no rich secondary content.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const DIALOG_WIDTH_MD: string = '32rem';

/**
 * Constant DIALOG_WIDTH_LG
 *
 * @description
 * `p-dialog` width for rich or two-column bodies — detail views, definition
 * lists, and other content too wide for {@link DIALOG_WIDTH_MD}.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const DIALOG_WIDTH_LG: string = '42rem';

/**
 * Constant DIALOG_BREAKPOINTS
 *
 * @description
 * The one canonical `p-dialog` `[breakpoints]` object: at 640px and below,
 * the dialog shrinks to 92vw so no dialog — at any of the three width steps
 * — ever exceeds a phone viewport.
 *
 * @since 1.0.0
 *
 * @type {Record<string, string>}
 */
export const DIALOG_BREAKPOINTS: Record<string, string> = { '640px': '92vw' };

/**
 * Constant DRAWER_STYLE_CLASS
 *
 * @description
 * `styleClass` for a `p-drawer`: full width on mobile, a fixed 34rem panel
 * from the `sm` breakpoint up.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const DRAWER_STYLE_CLASS: string = '!w-full sm:!w-[34rem]';
