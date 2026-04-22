import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';

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
   * Property INITIAL_DEFAULT_WIDTH
   * @readonly
   * @static
   *
   * @description
   * Initial default sidebar width in pixels when the layout
   * is initialized.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private static readonly INITIAL_DEFAULT_WIDTH: number = 288;

  /**
   * Property INITIAL_MIN_WIDTH
   * @readonly
   * @static
   *
   * @description
   * Initial minimum sidebar width in pixels.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private static readonly INITIAL_MIN_WIDTH: number = 200;

  /**
   * Property INITIAL_MAX_WIDTH
   * @readonly
   * @static
   *
   * @description
   * Initial maximum sidebar width in pixels.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private static readonly INITIAL_MAX_WIDTH: number = 480;

  /**
   * Property COLLAPSE_THRESHOLD
   * @readonly
   * @static
   *
   * @description
   * Width threshold in pixels below which the sidebar snaps to zero.
   * Used by the resize handle directive to trigger collapse instead of
   * clamping to minWidth.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {number}
   */
  public static readonly COLLAPSE_THRESHOLD: number = 120;

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
   * Property _isCollapsed
   * @readonly
   *
   * @description
   * Internal writable signal tracking whether the sidebar is fully collapsed
   * (width = 0). Exposed publicly through `isCollapsed`.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly _isCollapsed: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property defaultWidth
   *
   * @description
   * Configurable default sidebar width in pixels.
   *
   * @access public
   * @since 1.6.0
   *
   * @type {WritableSignal<number>}
   */
  public readonly defaultWidth: WritableSignal<number> = signal<number>(
    DashboardSidebarService.INITIAL_DEFAULT_WIDTH,
  );

  /**
   * Property minWidth
   *
   * @description
   * Configurable minimum sidebar width in pixels.
   *
   * @access public
   * @since 1.6.0
   *
   * @type {WritableSignal<number>}
   */
  public readonly minWidth: WritableSignal<number> = signal<number>(
    DashboardSidebarService.INITIAL_MIN_WIDTH,
  );

  /**
   * Property maxWidth
   *
   * @description
   * Configurable maximum sidebar width in pixels.
   *
   * @access public
   * @since 1.6.0
   *
   * @type {WritableSignal<number>}
   */
  public readonly maxWidth: WritableSignal<number> = signal<number>(
    DashboardSidebarService.INITIAL_MAX_WIDTH,
  );

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
  private readonly _width: WritableSignal<number> = signal<number>(
    this.clampWidth(this.defaultWidth()),
  );

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
   * Property isCollapsed
   * @readonly
   *
   * @description
   * Whether the sidebar is fully collapsed (width = 0). When true,
   * `width` returns 0 regardless of `_width`.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly isCollapsed: Signal<boolean> = this._isCollapsed.asReadonly();

  /**
   * Property width
   * @readonly
   *
   * @description
   * Controls the desktop sidebar width in pixels. Returns 0 when collapsed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  public readonly width: Signal<number> = computed<number>((): number =>
    this._isCollapsed() ? 0 : this.clampWidth(this._width()),
  );

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
    this._isCollapsed.set(false);
    this._width.set(this.clampWidth(width));
  }

  /**
   * Method collapse
   * @method collapse
   *
   * @description
   * Collapses the sidebar to zero width. The previously configured width
   * is preserved so that `expand()` restores it.
   *
   * @access public
   * @since 2.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  public collapse(): void {
    this._isCollapsed.set(true);
  }

  /**
   * Method expand
   * @method expand
   *
   * @description
   * Expands the sidebar from its collapsed state, restoring the
   * previously configured width.
   *
   * @access public
   * @since 2.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  public expand(): void {
    this._isCollapsed.set(false);
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
    this.setWidth(this.width() + delta);
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
    const minWidth: number = Math.min(this.minWidth(), this.maxWidth());
    const maxWidth: number = Math.max(this.minWidth(), this.maxWidth());

    return Math.min(maxWidth, Math.max(minWidth, width));
  }
  //#endregion
}
