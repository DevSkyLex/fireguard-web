import { Injectable, Signal, signal, WritableSignal } from '@angular/core';

/**
 * Service DashboardSidebarService
 * @class DashboardSidebarService
 *
 * @description
 * Layout-scoped service managing the sidebar state for the dashboard.
 * Provided at the {@link DashboardLayout} component level so each
 * layout instance gets its own isolated state.
 *
 * Child components ({@link DashboardLayoutHeader}, {@link DashboardLayoutSidebar})
 * inject this service directly, removing the need for output chaining.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardSidebarService {
  //#region Properties
  /**
   * Property _visible
   * @readonly
   *
   * @description
   * Internal writable signal for mobile drawer visibility.
   * Exposed publicly as a read-only signal through `visible`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly _visible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property _primaryCollapsed
   * @readonly
   *
   * @description
   * Internal writable signal tracking whether the desktop primary sidebar
   * is collapsed to its icon-only (reduced) form. Exposed publicly through
   * `primaryCollapsed`.
   *
   * @access private
   * @since 4.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly _primaryCollapsed: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Controls the mobile Drawer overlay visibility.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly visible: Signal<boolean> = this._visible.asReadonly();

  /**
   * Property primaryCollapsed
   * @readonly
   *
   * @description
   * Whether the desktop primary sidebar is collapsed to its icon-only
   * (reduced) form. Controlled by the user through the sidebar header
   * toggle button.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly primaryCollapsed: Signal<boolean> = this._primaryCollapsed.asReadonly();

  //#endregion

  //#region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Opens the mobile sidebar Drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  public open(): void {
    this._visible.set(true);
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the mobile sidebar Drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  public close(): void {
    this._visible.set(false);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Toggles the mobile sidebar Drawer visibility.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  public toggle(): void {
    this._visible.update((visible: boolean) => !visible);
  }

  /**
   * Method setVisible
   * @method setVisible
   *
   * @description
   * Sets the mobile sidebar Drawer visibility state.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {boolean} visible - Whether the drawer should be visible.
   *
   * @returns {void} - This method does not return a value.
   */
  public setVisible(visible: boolean): void {
    this._visible.set(visible);
  }

  /**
   * Method togglePrimaryCollapsed
   * @method togglePrimaryCollapsed
   *
   * @description
   * Toggles the desktop primary sidebar between its full and icon-only
   * (reduced) forms.
   *
   * @access public
   * @since 4.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  public togglePrimaryCollapsed(): void {
    this._primaryCollapsed.update((collapsed: boolean) => !collapsed);
  }

  /**
   * Method setPrimaryCollapsed
   * @method setPrimaryCollapsed
   *
   * @description
   * Sets the desktop primary sidebar collapsed (icon-only) state.
   *
   * @access public
   * @since 4.0.0
   *
   * @param {boolean} collapsed - Whether the primary sidebar should be collapsed.
   *
   * @returns {void} - This method does not return a value.
   */
  public setPrimaryCollapsed(collapsed: boolean): void {
    this._primaryCollapsed.set(collapsed);
  }
  //#endregion
}
