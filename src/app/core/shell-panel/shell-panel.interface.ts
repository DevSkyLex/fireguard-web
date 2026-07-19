import type { Signal } from '@angular/core';

/**
 * Interface ShellPanelPort
 * @interface ShellPanelPort
 *
 * @description
 * Lets a routed page open, close and query the shell's contextual right-hand
 * panels without importing `@layouts`. `features -> layouts` is not in the
 * dependency table (ARCHITECTURE §5), so the contract is **core-owned** and the
 * layout implements it — the same inversion `BOOT_READINESS_PORT` uses.
 *
 * ⚠️ Deviation worth knowing: §5.1 says core-owned contracts are bound by the
 * owning core provider. This one is bound by `provideDashboardLayoutSlots()`
 * instead, because the layout owns the concrete panel stack. It must stay in
 * that provider's `makeEnvironmentProviders` — binding it in the layout
 * component's `providers` array would put it on a component node, where a
 * routed page injecting the token resolves against the route's environment
 * injector and finds nothing.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ShellPanelPort {
  /**
   * Ids of the panels currently open, outermost last.
   *
   * @type {Signal<readonly string[]>}
   */
  readonly openPanelIds: Signal<readonly string[]>;

  /**
   * Opens a panel by id. No-op when the id is unknown or unavailable.
   *
   * @param {string} panelId the panel identifier
   *
   * @returns {void}
   */
  open(panelId: string): void;

  /**
   * Closes a panel by id, or every panel when omitted.
   *
   * @param {string} [panelId] the panel identifier
   *
   * @returns {void}
   */
  close(panelId?: string): void;

  /**
   * Opens the panel when closed, closes it when open.
   *
   * @param {string} panelId the panel identifier
   *
   * @returns {void}
   */
  toggle(panelId: string): void;
}
