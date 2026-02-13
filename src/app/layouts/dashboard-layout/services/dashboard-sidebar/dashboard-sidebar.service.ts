import { Injectable, Signal, signal, WritableSignal } from "@angular/core";

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
   * Property DEFAULT_WIDTH
   * @readonly
   * @static
   *
   * @description
   * Default sidebar width in pixels when the layout is initialized.
   * Used as the initial value for the width signal and
   * as a reference for reset operations.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  public static readonly DEFAULT_WIDTH: number = 288;

  /**
   * Property MIN_WIDTH
   * @readonly
   * @static
   *
   * @description
   * Minimum sidebar width in pixels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  public static readonly MIN_WIDTH: number = 200;

  /**
   * Property MAX_WIDTH
   * @readonly
   * @static
   *
   * @description
   * Maximum sidebar width in pixels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  public static readonly MAX_WIDTH: number = 480;

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
  private readonly _visible: WritableSignal<boolean> =
    signal<boolean>(false);

  /**
   * Property _width
   * @readonly
   *
   * @description
   * Internal writable signal for desktop sidebar width.
   * Exposed publicly as a read-only signal through `width`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  private readonly _width: WritableSignal<number> =
    signal<number>(DashboardSidebarService.DEFAULT_WIDTH);

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
  public readonly visible: Signal<boolean> =
    this._visible.asReadonly();

  /**
   * Property width
   * @readonly
   *
   * @description
   * Controls the desktop sidebar width in pixels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  public readonly width: Signal<number> =
    this._width.asReadonly();
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
   * Method setWidth
   * @method setWidth
   *
   * @description
   * Sets the desktop sidebar width while enforcing
   * configured constraints.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {number} width - Desired sidebar width in pixels.
   *
   * @returns {void} - This method does not return a value.
   */
  public setWidth(width: number): void {
    this._width.set(this.clampWidth(width));
  }

  /**
   * Method adjustWidth
   * @method adjustWidth
   *
   * @description
   * Adjusts the desktop sidebar width by a delta
   * while enforcing constraints.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {number} delta - Width delta in pixels.
   *
   * @returns {void} - This method does not return a value.
   */
  public adjustWidth(delta: number): void {
    this._width.update((currentWidth: number) => this.clampWidth(
      currentWidth + delta
    ));
  }

  /**
   * Method clampWidth
   * @method clampWidth
   *
   * @description
   * Clamps a sidebar width to configured minimum
   * and maximum values.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number} width - Desired sidebar width.
   *
   * @returns {number} - Clamped sidebar width.
   */
  private clampWidth(width: number): number {
    return Math.min(
      DashboardSidebarService.MAX_WIDTH,
      Math.max(DashboardSidebarService.MIN_WIDTH, width),
    );
  }
  //#endregion
}
