/**
 * Constant WORKSPACE_PANEL_COOKIE_NAME
 * @const WORKSPACE_PANEL_COOKIE_NAME
 *
 * @description
 * Cookie persisting whether the workspace contextual panel is open.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const WORKSPACE_PANEL_COOKIE_NAME: string = 'workspace-panel';

/**
 * Constant WORKSPACE_SIDEBAR_COOKIE_NAME
 * @const WORKSPACE_SIDEBAR_COOKIE_NAME
 *
 * @description
 * Cookie persisting whether the workspace channel sidebar is collapsed.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const WORKSPACE_SIDEBAR_COOKIE_NAME: string = 'workspace-sidebar-collapsed';

/**
 * Constant WORKSPACE_SHELL_COOKIE_MAX_AGE
 * @const WORKSPACE_SHELL_COOKIE_MAX_AGE
 *
 * @description
 * Lifetime of the workspace shell preference cookies, in seconds (one year).
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const WORKSPACE_SHELL_COOKIE_MAX_AGE: number = 365 * 24 * 60 * 60;

/**
 * Constant WORKSPACE_DESKTOP_QUERY
 * @const WORKSPACE_DESKTOP_QUERY
 *
 * @description
 * Media query separating the workspace's desktop and mobile shells. Kept at
 * `1024px` to match the source prototype's `matchMedia('(max-width: 1024px)')`
 * and Tailwind's `lg:` variant — in a media query `rem` resolves against the
 * initial 16px root, so `64rem` is 1024px regardless of `html { font-size: 14px }`.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const WORKSPACE_DESKTOP_QUERY: string = '(min-width: 1024px)';
