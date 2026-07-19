/**
 * Constant SHELL_RAIL_WIDTH_PX
 * @const SHELL_RAIL_WIDTH_PX
 *
 * @description
 * Width of the persistent organization rail.
 *
 * Ported from the design system's collaboration kit
 * (`ui_kits/fireguard-workspace/workspace.css`, `.ws-rail { width: 60px }`).
 * The `.dc.html` prototype could not supply it — its tail exceeds the design
 * API's 256 KiB read cap — so an earlier pass guessed 56px from the 38px tile
 * plus padding. The kit is authoritative.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const SHELL_RAIL_WIDTH_PX = 60;

/**
 * Constant SHELL_SIDEBAR_WIDTH_PX
 * @const SHELL_SIDEBAR_WIDTH_PX
 *
 * @description
 * Width of the expanded channel sidebar. Ported from `.ws-side`.
 *
 * Collapsing sets the width to zero rather than to an icon rail: with a
 * permanent 60px organization rail, a second icon rail rebuilds the
 * two-column navigation that was removed in July.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const SHELL_SIDEBAR_WIDTH_PX = 266;

/**
 * Constant SHELL_PANEL_WIDTH_PX
 * @const SHELL_PANEL_WIDTH_PX
 *
 * @description
 * Width of one contextual right-hand panel. Ported from `.ws-info`.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const SHELL_PANEL_WIDTH_PX = 330;

/**
 * Constant SHELL_INLINE_PANEL_MIN_WIDTH_PX
 * @const SHELL_INLINE_PANEL_MIN_WIDTH_PX
 *
 * @description
 * Viewport width from which one panel renders inline instead of as an overlay
 * drawer. Below it the shell is too narrow to give the conversation a usable
 * column alongside a 330px panel.
 *
 * DECIDED, not ported: the kit is a fixed-width mock with no responsive rules.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const SHELL_INLINE_PANEL_MIN_WIDTH_PX = 1280;

/**
 * Constant SHELL_SECOND_PANEL_MIN_WIDTH_PX
 * @const SHELL_SECOND_PANEL_MIN_WIDTH_PX
 *
 * @description
 * Viewport width from which a second panel may open alongside the first.
 * 60 + 266 + 2 x 330 = 986px of chrome, which needs Tailwind's `2xl` to leave
 * the content column readable.
 *
 * DECIDED, not ported.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const SHELL_SECOND_PANEL_MIN_WIDTH_PX = 1536;
