import type { Type } from '@angular/core';

/**
 * Interface SlotComponentSource
 * @interface SlotComponentSource
 *
 * @description
 * How a slot contribution names the component the shell must render.
 *
 * Two forms, one of which must be present:
 *
 * - `component` — the class itself. Simple, but it makes the contribution
 *   factory *statically* import the component, and every slot contribution is
 *   registered from `app.routes.ts`, which is in the eager graph. A single
 *   heavy panel registered this way (a map, a rich-text composer, a drag-drop
 *   board) therefore lands in the initial bundle even though the panel is
 *   closed on first paint.
 * - `loadComponent` — a `() => import(...)` thunk resolved by the shell the
 *   first time the contribution is actually rendered. The component and its
 *   dependencies move into their own lazy chunk.
 *
 * Prefer `loadComponent` for anything that is not visible on first paint.
 * Keep `component` for the handful of widgets the shell paints immediately
 * (the theme switcher, the account avatar) where a chunk round-trip would show
 * as a hole in the chrome.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SlotComponentSource {
  /**
   * The component class, imported eagerly.
   *
   * @type {Type<unknown> | undefined}
   */
  readonly component?: Type<unknown>;

  /**
   * Deferred loader for the component class. Ignored when `component` is set.
   *
   * @type {(() => Promise<Type<unknown>>) | undefined}
   */
  readonly loadComponent?: () => Promise<Type<unknown>>;
}
