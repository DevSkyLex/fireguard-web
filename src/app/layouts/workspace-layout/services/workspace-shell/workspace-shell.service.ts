import { BreakpointObserver } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CookieService } from '@core/cookie';
import {
  WORKSPACE_DESKTOP_QUERY,
  WORKSPACE_PANEL_COOKIE_NAME,
  WORKSPACE_SHELL_COOKIE_MAX_AGE,
  WORKSPACE_SIDEBAR_COOKIE_NAME,
} from './constants';
import type { WorkspaceMobilePane } from './models';

/**
 * Service WorkspaceShellService
 * @class WorkspaceShellService
 *
 * @description
 * Layout-scoped state for the workspace shell: the desktop breakpoint, which
 * pane the mobile viewport shows, whether the contextual right panel is open,
 * and whether the channel sidebar is collapsed.
 *
 * Provided at the {@link WorkspaceLayout} component level so each shell
 * instance owns isolated state, and injected directly by shell children rather
 * than threaded through outputs.
 *
 * Panel and sidebar preferences persist to cookies, so the server renders the
 * same shell the user last left — unlike {@link DashboardSidebarService}, whose
 * collapse state resets on every reload.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class WorkspaceShellService {
  //#region Properties
  /**
   * Property cookies
   * @readonly
   *
   * @description
   * Cookie transport used to persist and restore shell preferences. Reads work
   * on the server too, resolving against the inbound request headers.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {CookieService}
   */
  private readonly cookies: CookieService = inject<CookieService>(CookieService);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether a viewport actually exists.
   *
   * Load-bearing: {@link isDesktop} is `false` on the server for want of a
   * viewport, not because the viewport is narrow. Anything that reacts to
   * "we are on mobile" must check this first, or every desktop user is served
   * a first paint built for a phone.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property isDesktop
   * @readonly
   *
   * @description
   * Whether the viewport is at or above the workspace desktop breakpoint
   * (1024px). Below it the four columns collapse into a single pane.
   *
   * Starts `false` on the server, matching the app's existing shell behavior.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly isDesktop: Signal<boolean> = toSignal(
    inject<BreakpointObserver>(BreakpointObserver)
      .observe(WORKSPACE_DESKTOP_QUERY)
      .pipe(map((result): boolean => result.matches)),
    { initialValue: false },
  );

  /**
   * Property _mobilePane
   *
   * @description
   * Internal writable signal backing {@link mobilePane}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<WorkspaceMobilePane>}
   */
  private readonly _mobilePane: WritableSignal<WorkspaceMobilePane> =
    signal<WorkspaceMobilePane>('list');

  /**
   * Property _panelVisible
   *
   * @description
   * Internal writable signal backing {@link panelVisible}, seeded from the
   * persisted preference and defaulting to open.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly _panelVisible: WritableSignal<boolean> = signal<boolean>(
    this.readFlag(WORKSPACE_PANEL_COOKIE_NAME, true),
  );

  /**
   * Property _sidebarCollapsed
   *
   * @description
   * Internal writable signal backing {@link sidebarCollapsed}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly _sidebarCollapsed: WritableSignal<boolean> = signal<boolean>(
    this.readFlag(WORKSPACE_SIDEBAR_COOKIE_NAME, false),
  );

  /**
   * Property mobilePane
   * @readonly
   *
   * @description
   * Which pane the mobile viewport currently shows. Ignored on desktop, where
   * every column renders side by side.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<WorkspaceMobilePane>}
   */
  public readonly mobilePane: Signal<WorkspaceMobilePane> = this._mobilePane.asReadonly();

  /**
   * Property panelVisible
   * @readonly
   *
   * @description
   * Whether the contextual right panel is open. This is the user's intent only;
   * which panel actually renders is resolved by the mono-active `PANEL_SLOT`
   * from each contribution's own `active` signal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly panelVisible: Signal<boolean> = this._panelVisible.asReadonly();

  /**
   * Property sidebarCollapsed
   * @readonly
   *
   * @description
   * Whether the desktop channel sidebar is collapsed out of view.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly sidebarCollapsed: Signal<boolean> = this._sidebarCollapsed.asReadonly();
  //#endregion

  //#region Methods
  /**
   * Method showList
   * @method showList
   *
   * @description
   * Brings the channel sidebar back into view on mobile.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public showList(): void {
    this._mobilePane.set('list');
  }

  /**
   * Method showMain
   * @method showMain
   *
   * @description
   * Switches the mobile viewport to the conversation or page column. Also
   * closes the contextual panel, which would otherwise cover the very column
   * the user just navigated to — the source prototype does the same on every
   * channel and view change.
   *
   * Called from {@link WorkspaceLayout} on every routed navigation rather than
   * from each nav row: the channel rows, the org tiles, the info panel's linked
   * threads and the command palette all change the routed column, and a pane
   * switch that depends on remembering to wire it up is one that will be
   * forgotten.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public showMain(): void {
    this._mobilePane.set('main');

    // Browser-only: see {@link browser}. Suppressing the panel during SSR would
    // strip it from the first paint of every desktop session.
    if (this.browser && !this.isDesktop()) this._panelVisible.set(false);
  }

  /**
   * Method togglePanel
   * @method togglePanel
   *
   * @description
   * Toggles the contextual right panel and persists the new preference.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public togglePanel(): void {
    this.setPanelVisible(!this._panelVisible());
  }

  /**
   * Method setPanelVisible
   * @method setPanelVisible
   *
   * @description
   * Sets the contextual right panel visibility and persists the preference.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {boolean} visible - Whether the panel should be open.
   *
   * @return {void}
   */
  public setPanelVisible(visible: boolean): void {
    this._panelVisible.set(visible);
    this.writeFlag(WORKSPACE_PANEL_COOKIE_NAME, visible);
  }

  /**
   * Method toggleSidebarCollapsed
   * @method toggleSidebarCollapsed
   *
   * @description
   * Toggles the desktop channel sidebar and persists the new preference.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public toggleSidebarCollapsed(): void {
    this.setSidebarCollapsed(!this._sidebarCollapsed());
  }

  /**
   * Method setSidebarCollapsed
   * @method setSidebarCollapsed
   *
   * @description
   * Sets the desktop channel sidebar collapsed state and persists it.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {boolean} collapsed - Whether the sidebar should be collapsed.
   *
   * @return {void}
   */
  public setSidebarCollapsed(collapsed: boolean): void {
    this._sidebarCollapsed.set(collapsed);
    this.writeFlag(WORKSPACE_SIDEBAR_COOKIE_NAME, collapsed);
  }

  /**
   * Method readFlag
   * @method readFlag
   *
   * @description
   * Reads a persisted boolean preference. Cookies carry raw strings, so any
   * value other than the two known encodings falls back to the default.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} name - Cookie name.
   * @param {boolean} fallback - Value used when the cookie is absent or malformed.
   *
   * @return {boolean} The restored preference.
   */
  private readFlag(name: string, fallback: boolean): boolean {
    const raw: string | null = this.cookies.getCookie<string>(name);

    if (raw === '1') return true;
    if (raw === '0') return false;

    return fallback;
  }

  /**
   * Method writeFlag
   * @method writeFlag
   *
   * @description
   * Persists a boolean preference. No-ops on the server, where `CookieService`
   * cannot write.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} name - Cookie name.
   * @param {boolean} value - Preference to persist.
   *
   * @return {void}
   */
  private writeFlag(name: string, value: boolean): void {
    this.cookies.setCookie<string>({
      name,
      value: value ? '1' : '0',
      path: '/',
      maxAge: WORKSPACE_SHELL_COOKIE_MAX_AGE,
      sameSite: 'Lax',
    });
  }
  //#endregion
}
